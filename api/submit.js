// Truly dynamic order submission - accepts ANY form fields
const nodemailer = require('nodemailer');

// Optional: Import Supabase handler (only if you're using it)
let saveToSupabase = null;
try {
  if (process.env.ENABLE_SUPABASE === 'true') {
    const supabaseModule = require('./supabase');
    saveToSupabase = supabaseModule.saveToSupabase;
  }
} catch (error) {
  console.log('Supabase module not loaded - skipping database integration');
}

// Configuration
const ALLOWED_ORIGINS = [
  'https://formdz.netlify.app',
  'http://localhost:3000',
  'null'
];

const RECAPTCHA_THRESHOLD = 0.5;
const MAX_FIELD_LENGTH = 500;
const MAX_MESSAGE_LENGTH = 2000;
const MAX_REQUESTS_PER_HOUR = 10;

// Validation patterns (only used if fields exist)
const EMAIL_REGEX = /^[a-zA-Z0-9._%-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const PHONE_REGEX = /^[0-9+\-\s()]+$/;

// In-memory rate limiting store
const requestStore = new Map();

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

// Helper: Escape HTML to prevent XSS
const escapeHtml = (unsafe) => {
  if (typeof unsafe !== 'string') return unsafe;
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

// Helper: Validate email strictly (only if email exists)
const isValidEmail = (email) => {
  if (!email || typeof email !== 'string') return false;
  if (email.length > 100) return false;
  if (email.includes('\n') || email.includes('\r')) return false;
  return EMAIL_REGEX.test(email);
};

// Helper: Rate limit check by IP
const checkRateLimit = (ip) => {
  const now = Date.now();
  const oneHourAgo = now - 60 * 60 * 1000;

  if (!requestStore.has(ip)) {
    requestStore.set(ip, []);
  }

  const requests = requestStore.get(ip);
  const recentRequests = requests.filter(timestamp => timestamp > oneHourAgo);

  if (recentRequests.length >= MAX_REQUESTS_PER_HOUR) {
    return false;
  }

  recentRequests.push(now);
  requestStore.set(ip, recentRequests);
  return true;
};

// Helper: Verify reCAPTCHA
const verifyRecaptcha = async (token) => {
  try {
    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${token}`
    });
    return await response.json();
  } catch (error) {
    console.error('reCAPTCHA verification error:', error);
    throw new Error('reCAPTCHA verification failed');
  }
};

// Helper: Format field names
const formatFieldName = (key) => {
  return key;
};

// Helper: Detect if value is a price
const isPriceField = (key, value) => {
  if (key.toLowerCase().includes('price') || 
      key.toLowerCase().includes('total') || 
      key.toLowerCase().includes('cost') ||
      key.toLowerCase().includes('amount')) {
    return true;
  }

  if (typeof value === 'string') {
    return value.includes('DA') || 
           value.includes('DZD') || 
           value.includes('د.ج') ||
           value.includes('$') ||
           value.includes('€');
  }

  return false;
};




// Helper: Format value with proper styling
const formatValue = (key, value) => {
  if (!value || value === 'N/A') {
    return `<span style="color: #999; font-style: italic;">${value || 'N/A'}</span>`;
  }

  // Handle arrays
  if (Array.isArray(value)) {
    if (value.length === 0) return '<span style="color: #999; font-style: italic;">N/A</span>';

    // Handle array of objects (including nested ones)
    if (typeof value[0] === 'object') {
      const allKeys = [...new Set(value.flatMap(item => Object.keys(item)))];
      const headerHTML = allKeys.map(k => 
        `<th style="padding: 8px; text-align: right; background: #ff6b35; color: white; border: 1px solid #ddd;">${escapeHtml(k)}</th>`
      ).join('');

      const rowsHTML = value.map(item => `
        <tr>
          ${allKeys.map(k => {
            const cell = item[k];
            if (typeof cell === 'object' && cell !== null) {
              // Nested object (like selected_attributes)
              return `<td style="padding: 8px; border: 1px solid #ddd; text-align: right;">
                ${Object.entries(cell)
                  .map(([subKey, subVal]) => `<strong>${escapeHtml(subKey)}:</strong> ${escapeHtml(String(subVal))}`)
                  .join('<br>')}
              </td>`;
            }
            return `<td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${escapeHtml(String(cell ?? ''))}</td>`;
          }).join('')}
        </tr>
      `).join('');

      return `<table style="width: 100%; border-collapse: collapse; margin: 5px 0;"><thead><tr>${headerHTML}</tr></thead><tbody>${rowsHTML}</tbody></table>`;
    }

    // Simple array
    return `<ul style="margin: 0; padding-right: 20px; text-align: right;">${value.map(v => `<li>${escapeHtml(String(v))}</li>`).join('')}</ul>`;
  }

  // Handle object directly
  if (typeof value === 'object' && value !== null) {
    return Object.entries(value)
      .map(([k, v]) => `<strong>${escapeHtml(k)}:</strong> ${escapeHtml(String(v))}`)
      .join('<br>');
  }

  // Handle prices, phones, emails
  const stringValue = String(value);
  if (isPriceField(key, stringValue)) {
    return `<span style="font-weight: bold; color: #ff6b35; font-size: 16px;">${stringValue}</span>`;
  }
  if (key.toLowerCase().includes('phone') || /^[+]?[\d\s\-()]+$/.test(stringValue)) {
    const cleanPhone = stringValue.replace(/[^0-9+]/g, '');
    if (cleanPhone.length >= 7) {
      return `<a href="tel:${cleanPhone}" style="color: #0066cc; text-decoration: none; font-weight: 500;">${stringValue}</a>`;
    }
  }
  if (key.toLowerCase().includes('email') || EMAIL_REGEX.test(stringValue)) {
    return `<a href="mailto:${stringValue}" style="color: #0066cc; text-decoration: none; font-weight: 500;">${stringValue}</a>`;
  }

  return stringValue;
};





// Helper: Send Telegram notification to multiple chat IDs
const sendTelegramNotification = async (orderId, clientName) => {
  const chatIds = [
    process.env.TELEGRAM_CHAT_ID_1,
    process.env.TELEGRAM_CHAT_ID_3
  ].filter(id => id); // Filter out undefined/empty IDs

  if (chatIds.length === 0) {
    console.warn('No Telegram chat IDs configured');
    return;
  }

  const message = `
🔔 <b>New Order Received!</b>

📋 <b>Invoice:</b> <code>${orderId}</code>
👤 <b>Client:</b> ${clientName}

✅ Check your email for full details
  `.trim();

  const promises = chatIds.map(async (chatId) => {
    try {
      const response = await fetch(
        `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: message,
            parse_mode: 'HTML'
          })
        }
      );

      const result = await response.json();
      if (!result.ok) {
        console.error(`Telegram notification failed for chat ${chatId}:`, result);
      } else {
        console.log(`Telegram notification sent successfully to chat ${chatId}`);
      }
    } catch (error) {
      console.error(`Telegram notification error for chat ${chatId}:`, error);
    }
  });

  // Send to all chats in parallel
  await Promise.allSettled(promises);
};




// Main handler
// Main handler
exports.handler = async (event) => {
  console.log('=== NEW ORDER REQUEST ===');

  try {
    // Handle OPTIONS for CORS preflight
    if (event.httpMethod === 'OPTIONS') {
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: ''
      };
    }

    // Check HTTP method
    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Method not allowed' })
      };
    }

    // Validate origin
    const origin = event.headers.origin || event.headers.referer || '';
    const originValid = !origin || ALLOWED_ORIGINS.some(allowed => origin.includes(allowed));

    if (!originValid) {
      console.warn(`Rejected request from invalid origin: ${origin}`);
      return {
        statusCode: 403,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Unauthorized origin' })
      };
    }

    // Parse request body
    let data;
    try {
      data = JSON.parse(event.body);
      console.log('Received form fields:', Object.keys(data));
    } catch {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Invalid JSON' })
      };
    }

    // Rate limiting by IP
    const clientIp = event.headers['client-ip'] || 
                     event.headers['x-forwarded-for']?.split(',')[0] || 
                     'unknown';

    if (!checkRateLimit(clientIp)) {
      console.warn(`Rate limit exceeded for IP: ${clientIp}`);
      return {
        statusCode: 429,
        headers: corsHeaders,
        body: JSON.stringify({ 
          error: 'Too many requests. Please try again later.' 
        })
      };
    }

    // Validate honeypot (bot protection)
    if (data.honeypot && data.honeypot.trim() !== '') {
      console.warn('Honeypot triggered - likely spam bot');
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Validation failed' })
      };
    }

    // Verify reCAPTCHA token (if provided)
    if (data.recaptchaToken) {
      try {
        const recaptchaResult = await verifyRecaptcha(data.recaptchaToken);

        if (!recaptchaResult.success) {
          console.warn('reCAPTCHA verification failed:', recaptchaResult);
          return {
            statusCode: 403,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'reCAPTCHA verification failed' })
          };
        }

        if (recaptchaResult.score < RECAPTCHA_THRESHOLD) {
          console.warn(`reCAPTCHA score too low: ${recaptchaResult.score}`);
          return {
            statusCode: 403,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Suspicious activity detected' })
          };
        }
      } catch (error) {
        console.error('reCAPTCHA error:', error);
      }
    }

    // Validate email format if email field exists
    if (data.email && !isValidEmail(data.email)) {
      console.warn('Invalid email format:', data.email);
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Invalid email format' })
      };
    }

    // Sanitize and process all form data dynamically
    const sanitizedData = {};

    for (const [key, value] of Object.entries(data)) {
      // Skip internal fields
      if (key === 'recaptchaToken' || key === 'honeypot') continue;

      if (typeof value === 'string') {
        sanitizedData[key] = escapeHtml(value.trim()) || 'N/A';
      } else if (Array.isArray(value) || typeof value === 'object') {
        sanitizedData[key] = value;
      } else {
        sanitizedData[key] = value || 'N/A';
      }
    }

    // Add timestamp in numeric format
    sanitizedData.submittedAt = new Date().toLocaleString('en-GB', { 
      timeZone: 'Africa/Algiers',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).replace(',', '');

    // Populate IP address if there's an ipAddress field that's empty/null
    if (sanitizedData.tracking && typeof sanitizedData.tracking === 'object') {
      if (!sanitizedData.tracking.ipAddress || sanitizedData.tracking.ipAddress === 'null') {
        sanitizedData.tracking.ipAddress = clientIp;
      }
    }
    
    // Also check for standalone ipAddress field
    if (data.ipAddress !== undefined && (!data.ipAddress || data.ipAddress === 'null')) {
      sanitizedData.ipAddress = clientIp;
    }

    // Generate human-readable order ID (INV-XXXXXX)
    const generateOrderId = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let code = '';
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return `INV-${code}`;
    };

    const orderId = generateOrderId();
    const orderDate = new Date().toLocaleString('en-GB', { 
      timeZone: 'Africa/Algiers',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).replace(',', '');

    console.log(`Processing order: ${orderId}`);

    // Generate table rows for email - flatten nested objects
    const generateTableRows = (data, prefix = '') => {
      let rows = '';
      
      for (const [key, value] of Object.entries(data)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        
        // If it's a nested object (but not an array), flatten it
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          rows += generateTableRows(value, fullKey);
        } else {
          // Render as a table row
          rows += `
            <tr style="border-bottom: 1px solid #e0e0e0;">
              <td style="padding: 12px 15px; text-align: left; background-color: #f8f9fa; font-weight: 500; color: #333; width: 35%; vertical-align: top;">
                ${formatFieldName(fullKey)}
              </td>
              <td style="padding: 12px 15px; text-align: right; background-color: #ffffff; color: #333; direction: rtl;">
                ${formatValue(key, value)}
              </td>
            </tr>
          `;
        }
      }
      
      return rows;
    };
    
    const tableRows = generateTableRows(sanitizedData);

    // Get reply-to email (if exists)
    const replyToEmail = data.email || process.env.GMAIL_USER;

    // Send email via Nodemailer
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
      }
    });

    await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to: process.env.GMAIL_USER,
      replyTo: replyToEmail,
      subject: `📋 New Order ${orderId}`,
      html: `
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
          <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f5f5f5;">
            <tr>
              <td style="padding: 20px 0;">
                <table role="presentation" style="width: 100%; max-width: 800px; margin: 0 auto; border-collapse: collapse; background-color: #ffffff; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                  
                  <!-- Header -->
                  <tr>
                    <td style="background-color: #000000; padding: 25px 30px; text-align: left;">
                      <h1 style="margin: 0; color: #ffffff; font-size: 18px; font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase;">
                        New Order
                      </h1>
                    </td>
                  </tr>
                  
                  <!-- Order Info -->
                  <tr>
                    <td style="padding: 20px 30px; background-color: #fff; border-bottom: 3px solid #ff6b35;">
                      <table role="presentation" style="width: 100%; border-collapse: collapse;">
                        <tr>
                          <td style="text-align: left; padding: 5px 0;">
                            <span style="font-size: 14px; color: #666;">Order Number:</span><br>
                            <span style="font-size: 14px; font-weight: 700; color: #000;">${orderId}</span>
                          </td>
                          <td style="text-align: right; padding: 5px 0;">
                            <span style="font-size: 14px; color: #666;">Date & Time:</span><br>
                            <span style="font-size: 12px; font-weight: 600; color: #000;">${orderDate}</span>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  
                  <!-- Order Details Table -->
                  <tr>
                    <td style="padding: 0;">
                      <table role="presentation" style="width: 100%; border-collapse: collapse;">
                        ${tableRows}
                      </table>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="padding: 20px 30px; background-color: #f8f9fa; border-top: 1px solid #e0e0e0; text-align: center;">
                      <p style="margin: 0; font-size: 12px; color: #666; line-height: 1.4;">
                        Made in Algeria 🇩🇿
                      </p>
                    </td>
                  </tr>
                  
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `
    });

    console.log(`Order processed successfully: ${orderId}`);

    // Get client name for Telegram notification
    const getClientName = (data) => {
      if (!data) return 'Unknown Client';
      
      return (
        data.name ||
        data.fullName ||
        data.customerName ||
        data.client ||
        data.customer?.name ||
        data.customerInfo?.customer_name ||
        data.customer_info?.name ||
        'Unknown Client'
      );
    };

    const clientName = getClientName(data);
    
    // Send Telegram notification
    await sendTelegramNotification(orderId, clientName);

    // Save to Supabase (only if enabled)
    if (saveToSupabase) {
      await saveToSupabase(orderId, sanitizedData, clientIp);
    }

    // Success response
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        message: 'تم إرسال الطلب بنجاح! سنتواصل معك قريباً.',
        orderId: orderId
      })
    };

  } catch (error) {
    console.error('Order processing error:', error);

    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: 'حدث خطأ في معالجة الطلب. يرجى المحاولة لاحقاً.',
        debug: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    };
  }
};
