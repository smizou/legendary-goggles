// main.js - Universal Form Handler

const CONFIG = {
    formSelector: '[data-dynamic-form]',
    apiEndpoint: '/.netlify/functions/submit',
    recaptchaSiteKey: '6Lfgft8rAAAAAF7IiVk0-LjPvlGvu29VO8j8eE5r',
    deliveryDataFile: '../json/_data.json'
};

let deliveryData = [];

// ============================================
// JOB 1: FETCH & POPULATE DELIVERY DATA
// ============================================
async function loadDeliveryData() {
    try {
        const response = await fetch(CONFIG.deliveryDataFile);
        deliveryData = await response.json();
        populateWilayaSelect();
    } catch (error) {
        console.error('Error loading delivery data:', error);
    }
}

function populateWilayaSelect() {
    const wilayaSelect = document.querySelector('[data-wilaya], #wilaya, select[name="wilaya"]');
    if (!wilayaSelect || deliveryData.length === 0) return;

    wilayaSelect.innerHTML = '<option value="">اختر الولاية</option>';

    deliveryData.forEach(wilaya => {
        const option = document.createElement('option');
        option.value = wilaya.wilaya_name;
        option.textContent = `${wilaya.wilaya_code} - ${wilaya.wilaya_name}`;
        option.dataset.rate = wilaya.rate;
        option.dataset.communes = wilaya.commune;
        wilayaSelect.appendChild(option);
    });
}

function setupLocationControls() {
    const wilayaSelect = document.querySelector('[data-wilaya], #wilaya, select[name="wilaya"]');
    const communeSelect = document.querySelector('[data-commune], #commune, select[name="commune"]');

    if (!wilayaSelect) return;

    wilayaSelect.addEventListener('change', function(e) {
        const selected = e.target.selectedOptions[0];

        if (communeSelect) {
            communeSelect.innerHTML = '<option value="">اختر البلدية</option>';
            communeSelect.disabled = !selected || !selected.value;
        }

        if (selected && selected.value && communeSelect) {
            const communes = selected.dataset.communes;
            if (communes) {
                communes.split(',').forEach(function(commune) {
                    const option = document.createElement('option');
                    option.value = commune.trim();
                    option.textContent = commune.trim();
                    communeSelect.appendChild(option);
                });
            }
        }
    });
}

// ============================================
// JOB 2: DETECT ALL FIELDS & SUBMIT DYNAMICALLY
// ============================================
function createModal() {
    if (document.getElementById('dynamicModal')) return;

    const modalHTML = `
        <div id="dynamicModal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); z-index: 1000; align-items: center; justify-content: center;">
            <div style="background: white; border-radius: 12px; max-width: 400px; width: 90%; margin: 20px; padding: 30px; text-align: center;">
                <div id="dynamicModalContent"></div>
                <button id="dynamicModalClose" style="width: 100%; background: #00c851; color: white; border: none; padding: 12px; border-radius: 8px; font-size: 16px; font-weight: bold; margin-top: 20px; cursor: pointer;">
                    حسناً
                </button>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const modal = document.getElementById('dynamicModal');
    const closeBtn = document.getElementById('dynamicModalClose');

    closeBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', function(e) {
        if (e.target === modal) closeModal();
    });
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') closeModal();
    });
}

function showModal(type, message) {
    const modal = document.getElementById('dynamicModal');
    const content = document.getElementById('dynamicModalContent');
    if (!modal || !content) return;

    const icon = type === 'success' 
        ? '<svg style="width: 80px; height: 80px; margin: 0 auto 20px; color: #00c851;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>'
        : '<svg style="width: 80px; height: 80px; margin: 0 auto 20px; color: #dc3545;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>';

    content.innerHTML = icon + message;
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    const modal = document.getElementById('dynamicModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = '';
    }
}

function setupFormValidation(form) {
    const inputs = form.querySelectorAll('input[required], select[required], textarea[required]');

    inputs.forEach(function(input) {
        input.addEventListener('invalid', function(e) {
            e.preventDefault();
            highlightField(input);
        });

        input.addEventListener('input', function() {
            removeHighlight(input);
        });

        input.addEventListener('change', function() {
            removeHighlight(input);
        });
    });

    const radioGroups = form.querySelectorAll('input[type="radio"][required]');
    const groupNames = new Set();

    radioGroups.forEach(function(radio) {
        if (radio.name) groupNames.add(radio.name);
    });

    groupNames.forEach(function(name) {
        const radios = form.querySelectorAll('input[name="' + name + '"]');
        radios.forEach(function(radio) {
            radio.addEventListener('change', function() {
                const container = radio.closest('[data-radio-group], .size-options, .color-options');
                if (container) container.style.border = 'none';
            });
        });
    });
}

function highlightField(field) {
    field.style.border = '2px solid #dc3545';

    if (field.type === 'radio') {
        const container = field.closest('[data-radio-group], .size-options, .color-options');
        if (container) {
            container.style.border = '2px solid #dc3545';
            container.style.borderRadius = '8px';
            container.style.padding = '10px';
        }
    }

    const label = field.previousElementSibling;
    const labelText = label && label.tagName === 'LABEL' 
        ? label.textContent.replace('*', '').trim() 
        : field.name || field.id;

    showValidationMessage('يرجى ملء حقل ' + labelText);
    field.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function removeHighlight(field) {
    field.style.border = '';
}

function showValidationMessage(message) {
    const existingMsg = document.querySelector('.validation-message');
    if (existingMsg) existingMsg.remove();

    const msgDiv = document.createElement('div');
    msgDiv.className = 'validation-message';
    msgDiv.style.cssText = 'position: fixed; top: 20px; left: 50%; transform: translateX(-50%); background: #dc3545; color: white; padding: 15px 25px; border-radius: 8px; z-index: 10000; box-shadow: 0 4px 12px rgba(0,0,0,0.3); font-weight: bold;';
    msgDiv.textContent = message;
    document.body.appendChild(msgDiv);

    setTimeout(function() {
        msgDiv.remove();
    }, 3000);
}

async function handleFormSubmit(e) {
    e.preventDefault();

    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"], input[type="submit"]');
    const originalText = submitBtn ? submitBtn.innerHTML : '';

    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '... جاري الإرسال';
    }

    try {
        const formData = collectFormData(form);

        if (typeof grecaptcha !== 'undefined') {
            const token = await grecaptcha.execute(CONFIG.recaptchaSiteKey, { action: 'submit' });
            formData.recaptchaToken = token;
        }

        const response = await fetch(CONFIG.apiEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });

        if (!response.ok) throw new Error('خطأ في الاتصال بالخادم: ' + response.status);

        const result = await response.json();

        if (result.success) {
            showModal('success', `
                <h3 style='font-size: 20px; font-weight: bold; color: #00c851; margin-bottom: 15px;'>✅ تم استلام طلبك بنجاح!</h3>
                <p style='color: #666; margin-bottom: 10px;'>شكراً ${formData.fullName || formData.name || ''}</p>
                <p style='color: #666; margin-bottom: 10px;'>سنتصل بك قريباً لتأكيد الطلب.</p>
            `);
            form.reset();
        } else {
            throw new Error(result.error || 'فشل إرسال الطلب');
        }
    } catch (error) {
        console.error('Form submission error:', error);
        showModal('error', `
            <h3 style="font-size: 20px; font-weight: bold; color: #dc3545; margin-bottom: 15px;">حدث خطأ</h3>
            <p style='color: #666; font-size: 14px;'>${error.message}</p>
            <p style='color: #666; font-size: 14px; margin-top: 10px;'>يرجى المحاولة مرة أخرى</p>
        `);
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    }
}

function collectFormData(form) {
    const formData = new FormData(form);
    const data = {};

    for (let pair of formData.entries()) {
        data[pair[0]] = pair[1];
    }

    return data;
}

function init() {
    const form = document.querySelector(CONFIG.formSelector);
    if (!form) return;

    loadDeliveryData();
    setupLocationControls();
    setupFormValidation(form);
    createModal();

    form.addEventListener('submit', handleFormSubmit);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
