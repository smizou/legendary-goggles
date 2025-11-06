// netlify/functions/telegram.js

const ALLOWED_ORIGINS = [
  'https://formdz.netlify.app',
  'https://simplanding.netlify.app'
];

const RECAPTCHA_THRESHOLD = 0.5;
const MAX_FIELD_LENGTH = 500;
const MAX_MESSAGE_LENGTH = 2000;
const MAX_REQUESTS_PER_HOUR = 10;

const PHONE_REGEX = /^(\+213|0)[5-7][0-9]{8}$/;

const requestStore = new Map();

const escapeHtml = (unsafe) => {
  if (typeof unsafe !== 'string') return unsafe;
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

const isValidPhone = (phone) => {
  if (!phone || typeof phone !== 'string') return false;
  const cleaned = phone.replace(/[\s\-()]/g, '');
  return PHONE_REGEX.test(cleaned);
};

const validateStringLength = (str, maxLength, fieldName) => {
  if (!str || typeof str !== 'string') return false;
  if (str.length > maxLength) {
    throw new Error(`${fieldName} exceeds maximum length of ${maxLength}`);
  }
  return true;
};

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

const sendTelegramMessage = async (message, chatId) => {
  try {
    const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;

    if (!telegramBotToken) {
      console.error('Telegram bot token not configured');
      throw new Error('Telegram not configured');
    }

    const response = await fetch(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML'
      })
    });

    const result = await response.json();

    if (!result.ok) {
      console.error(`Telegram API error for chat ${chatId}:`, result);
      throw new Error(`Telegram send failed for chat ${chatId}`);
    }

    return true;
  } catch (error) {
    console.error(`Telegram message error for chat ${chatId}:`, error);
    throw error;
  }
};

const sendToMultipleTelegramChats = async (message) => {
  const telegramChatId1 = process.env.TELEGRAM_CHAT_ID_1;
  const telegramChatId2 = process.env.TELEGRAM_CHAT_ID_2;

  if (!telegramChatId1 && !telegramChatId2) {
    console.error('No Telegram chat IDs configured');
    throw new Error('Telegram chat IDs not configured');
  }

  const promises = [];

  if (telegramChatId1) {
    promises.push(sendTelegramMessage(message, telegramChatId1));
  }

  if (telegramChatId2) {
    // promises.push(sendTelegramMessage(message, telegramChatId2));
  }

  await Promise.all(promises);
};

const formatTelegramMessage = (orderId, orderDate, sanitizedData) => {
  const deliveryIcon = sanitizedData.deliveryType === 'استلام من المكتب' ? '🏢' : '🚚';

  return `
🆔 <b>طلب جديد #${orderId}</b>
📅 <b>التاريخ:</b> ${orderDate}
━━━━━━━━━━━━━━━━━━━━

👤 <b>معلومات العميل:</b>
• <b>الاسم:</b> ${sanitizedData.fullName}
• <b>الهاتف:</b> ${sanitizedData.phone}

📍 <b>معلومات التوصيل:</b>
• <b>الولاية:</b> ${sanitizedData.wilaya}
• <b>البلدية:</b> ${sanitizedData.commune}
• <b>نوع التوصيل:</b> ${deliveryIcon} ${sanitizedData.deliveryType}

📦 <b>تفاصيل الطلب:</b>
• <b>المنتج:</b> ${sanitizedData.productName}
• <b>المقاس:</b> ${sanitizedData.size}
• <b>اللون:</b> ${sanitizedData.color}
• <b>الكمية:</b> ${sanitizedData.quantity}
• <b>سعر المنتج:</b> ${sanitizedData.productPrice}
• <b>سعر التوصيل:</b> ${sanitizedData.deliveryPrice}
• <b>المبلغ الإجمالي:</b> ${sanitizedData.totalPrice}

━━━━━━━━━━━━━━━━━━━━
📞 <i>يرجى الاتصال بالعميل لتأكيد الطلب</i>
  `.trim();
};

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        body: JSON.stringify({ error: 'Method not allowed' })
      };
    }

    const origin = event.headers.origin || event.headers.referer || '';
    const originValid = ALLOWED_ORIGINS.some(allowed => origin.includes(allowed));

    if (!originValid) {
      console.warn(`Rejected request from invalid origin: ${origin}`);
      return {
        statusCode: 403,
        body: JSON.stringify({ error: 'Unauthorized origin' })
      };
    }

    let data;
    try {
      data = JSON.parse(event.body);
    } catch {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid JSON' })
      };
    }

    const clientIp = event.headers['client-ip'] || 
                     event.headers['x-forwarded-for']?.split(',')[0] || 
                     'unknown';

    if (!checkRateLimit(clientIp)) {
      console.warn(`Rate limit exceeded for IP: ${clientIp}`);
      return {
        statusCode: 429,
        body: JSON.stringify({ 
          error: 'Too many requests. Please try again later.' 
        })
      };
    }

    if (data.honeypot && data.honeypot.trim() !== '') {
      console.warn('Honeypot triggered - likely spam bot');
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Validation failed' })
      };
    }

    if (!data.recaptchaToken) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'reCAPTCHA token missing' })
      };
    }

    const recaptchaResult = await verifyRecaptcha(data.recaptchaToken);

    if (!recaptchaResult.success) {
      console.warn('reCAPTCHA verification failed:', recaptchaResult);
      return {
        statusCode: 403,
        body: JSON.stringify({ error: 'reCAPTCHA verification failed' })
      };
    }

    if (recaptchaResult.score < RECAPTCHA_THRESHOLD) {
      console.warn(`reCAPTCHA score too low: ${recaptchaResult.score}`);
      return {
        statusCode: 403,
        body: JSON.stringify({ error: 'Suspicious activity detected' })
      };
    }

    if (!data.fullName || data.fullName.trim() === '') {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Full name is required' })
      };
    }

    if (!data.phone || !isValidPhone(data.phone)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Valid phone number is required' })
      };
    }

    if (!data.wilaya || data.wilaya.trim() === '') {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Wilaya is required' })
      };
    }

    if (!data.commune || data.commune.trim() === '') {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Commune is required' })
      };
    }

    if (!data.size || data.size.trim() === '') {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Size is required' })
      };
    }

    if (!data.color || data.color.trim() === '') {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Color is required' })
      };
    }

    if (!data.quantity || isNaN(data.quantity) || data.quantity < 1) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Valid quantity is required' })
      };
    }

    validateStringLength(data.fullName, 100, 'Full name');
    validateStringLength(data.wilaya, MAX_FIELD_LENGTH, 'Wilaya');
    validateStringLength(data.commune, MAX_FIELD_LENGTH, 'Commune');
    validateStringLength(data.size, 10, 'Size');
    validateStringLength(data.color, 50, 'Color');

    const sanitizedData = {
      fullName: escapeHtml(data.fullName.trim()),
      phone: escapeHtml(data.phone.trim()),
      wilaya: escapeHtml(data.wilaya.trim()),
      commune: escapeHtml(data.commune.trim()),
      size: escapeHtml(data.size.trim()),
      color: escapeHtml(data.color.trim()),
      deliveryType: escapeHtml(data.deliveryType || 'توصيل إلى المنزل'),
      quantity: parseInt(data.quantity),
      productName: escapeHtml(data.productName || 'منتج'),
      productPrice: escapeHtml(data.productPrice || 'N/A'),
      deliveryPrice: escapeHtml(data.deliveryPrice || 'N/A'),
      totalPrice: escapeHtml(data.totalPrice || 'N/A'),
      submittedAt: new Date().toISOString()
    };

    const orderId = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const orderDate = new Date().toLocaleString('ar-DZ', {timeZone: 'Africa/Algiers'});

    const telegramMessage = formatTelegramMessage(orderId, orderDate, sanitizedData);
    await sendToMultipleTelegramChats(telegramMessage);

    console.log(`Order processed successfully via Telegram: ${orderId}`);

    return {
      statusCode: 200,
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
      body: JSON.stringify({
        error: 'حدث خطأ في معالجة الطلب. يرجى المحاولة لاحقاً.'
      })
    };
  }
};