// Gallery functionality
let currentSlide = 0;
const slides = document.querySelectorAll('.gallery-slide');
const thumbnails = document.querySelectorAll('.thumbnail');
const totalSlides = slides.length;

function showSlide(index) {
    if (index >= totalSlides) {
        currentSlide = 0;
    } else if (index < 0) {
        currentSlide = totalSlides - 1;
    } else {
        currentSlide = index;
    }

    slides.forEach(slide => slide.classList.remove('active'));
    thumbnails.forEach(thumb => thumb.classList.remove('active'));

    slides[currentSlide].classList.add('active');
    thumbnails[currentSlide].classList.add('active');
}

function changeSlide(direction) {
    showSlide(currentSlide + direction);
}

function goToSlide(index) {
    showSlide(index);
}

document.addEventListener('keydown', function(e) {
    if (e.key === 'ArrowLeft') {
        changeSlide(1);
    } else if (e.key === 'ArrowRight') {
        changeSlide(-1);
    }
});

// FAQ accordion functionality
function toggleFAQ(index) {
    const answer = document.getElementById(`faq-answer-${index}`);
    const question = answer.previousElementSibling;
    const icon = question.querySelector('.faq-icon');
    const isOpen = answer.classList.contains('open');

    document.querySelectorAll('.faq-answer').forEach((item, i) => {
        if (i !== index) {
            item.classList.remove('open');
            const otherQuestion = item.previousElementSibling;
            const otherIcon = otherQuestion.querySelector('.faq-icon');
            otherIcon.style.transform = 'rotate(0deg)';
            otherQuestion.setAttribute('aria-expanded', 'false');
        }
    });

    if (isOpen) {
        answer.classList.remove('open');
        icon.style.transform = 'rotate(0deg)';
        question.setAttribute('aria-expanded', 'false');
    } else {
        answer.classList.add('open');
        icon.style.transform = 'rotate(180deg)';
        question.setAttribute('aria-expanded', 'true');
    }
}

// Modal functions
function showModal(type, message) {
    const modal = document.getElementById('modal');
    const modalContent = document.getElementById('modal-content');

    if (type === 'success') {
        modalContent.innerHTML = `
            <svg class="w-20 h-20 mx-auto mb-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            ${message}
        `;
    } else {
        modalContent.innerHTML = `
            <svg class="w-20 h-20 mx-auto mb-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <h3 class="text-2xl font-bold text-red-600 mb-4">حدث خطأ</h3>
            <p class="text-gray-700">${message}</p>
        `;
    }

    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    const modal = document.getElementById('modal');
    modal.classList.remove('show');
    document.body.style.overflow = '';
}

document.getElementById('modal').addEventListener('click', function(e) {
    if (e.target === this) {
        closeModal();
    }
});

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeModal();
    }
});

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Animation on scroll
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver(function(entries) {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

document.querySelectorAll('section').forEach(section => {
    section.style.opacity = '0';
    section.style.transform = 'translateY(20px)';
    section.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(section);
});

// Delivery & Pricing System
const productPriceBase = 145000;
let deliveryData = [];
let selectedRates = { home: 0, desk: 0 };

const wilayaSelect = document.getElementById('wilaya');
const communeSelect = document.getElementById('commune');
const quantityInput = document.getElementById('quantity');
const deliveryPriceSpan = document.getElementById('deliveryPrice');
const totalPriceSpan = document.getElementById('totalPrice');
const productPriceSpan = document.getElementById('productPrice');
const form = document.getElementById('orderForm');

async function loadDeliveryData() {
    try {
        const res = await fetch('extracted_data.json');
        deliveryData = await res.json();
        populateWilayas();
    } catch (e) {
        console.error('Error loading delivery data:', e);
        showModal('error', 'فشل تحميل بيانات التوصيل');
    }
}

function populateWilayas() {
    wilayaSelect.innerHTML = '<option value="">اختر الولاية</option>';
    deliveryData.forEach(w => {
        const opt = document.createElement('option');
        opt.value = w.wilaya_name;
        opt.textContent = `${w.wilaya_code} - ${w.wilaya_name}`;
        opt.dataset.rate = w.rate;
        opt.dataset.communes = w.commune;
        wilayaSelect.appendChild(opt);
    });
}

function parseRates(rateStr = '') {
    const [home, desk] = rateStr.replace(/\s/g, '').split(',').map(r => parseInt(r) || 0);
    selectedRates = { home, desk };
}

function updatePrices() {
    const q = Math.max(1, parseInt(quantityInput.value) || 1);
    const deliveryType = document.querySelector('input[name="deliveryType"]:checked')?.value || 'home';
    const deliveryPrice = deliveryType === 'desk' ? selectedRates.desk : selectedRates.home;
    const productPrice = productPriceBase * q;
    const total = productPrice + deliveryPrice;

    productPriceSpan.textContent = productPrice.toLocaleString() + ' د.ج';
    deliveryPriceSpan.textContent = deliveryPrice ? deliveryPrice.toLocaleString() + ' د.ج' : '-- د.ج';
    totalPriceSpan.textContent = total ? total.toLocaleString() + ' د.ج' : '-- د.ج';
}

wilayaSelect.addEventListener('change', e => {
    const selected = e.target.selectedOptions[0];
    communeSelect.innerHTML = '<option value="">اختر البلدية</option>';

    if (!selected || !selected.value) {
        communeSelect.disabled = true;
        selectedRates = { home: 0, desk: 0 };
        updatePrices();
        return;
    }

    const communes = (selected.dataset.communes || '').split(',').map(c => c.trim());
    communes.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c;
        opt.textContent = c;
        communeSelect.appendChild(opt);
    });
    communeSelect.disabled = false;

    parseRates(selected.dataset.rate);
    updatePrices();
});

document.querySelectorAll('input[name="deliveryType"]').forEach(r => {
    r.addEventListener('change', updatePrices);
});

quantityInput.addEventListener('input', updatePrices);
quantityInput.addEventListener('change', updatePrices);


// Form submission
form.addEventListener('submit', async e => {
    e.preventDefault();

    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = '... جاري الإرسال';

    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    const q = Math.max(1, parseInt(quantityInput.value) || 1);
    const deliveryType = document.querySelector('input[name="deliveryType"]:checked')?.value || 'home';
    const deliveryPrice = deliveryType === 'desk' ? selectedRates.desk : selectedRates.home;
    const productPrice = productPriceBase * q;
    const total = productPrice + deliveryPrice;

    // Données envoyées
    const orderData = {
        fullName: data.fullName,
        phone: data.phone,
        wilaya: data.wilaya,
        commune: data.commune,
        size: data.size,
        color: data.color,
        quantity: q,
        deliveryType: deliveryType === 'home' ? 'توصيل إلى المنزل' : 'استلام من المكتب',
        productName: 'لابتوب Intel Core i7',
        productPrice: productPrice.toLocaleString() + ' د.ج',
        deliveryPrice: deliveryPrice.toLocaleString() + ' د.ج',
        totalPrice: total.toLocaleString() + ' د.ج'
    };

    console.log('📦 Données envoyées:', orderData);

    try {
        const token = await grecaptcha.execute('6Lfgft8rAAAAAF7IiVk0-LjPvlGvu29VO8j8eE5r', {action: 'submit'});
        orderData.recaptchaToken = token;

        const res = await fetch('/.netlify/functions/telegram', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderData)
        });

        console.log('📡 Statut:', res.status);

        const result = await res.json();
        console.log('📥 Réponse:', result);

        if (res.ok && result.success) {
            showModal('success', `
                <h3 class='text-2xl font-bold text-green-600 mb-4'>✅ تم استلام طلبك بنجاح!</h3>
                <p class='text-gray-700 mb-2'>شكراً ${orderData.fullName}</p>
                <p class='text-gray-600'>سنتصل بك على الرقم ${orderData.phone} لتأكيد الطلب.</p>
                <p class='text-amber-700 font-bold mt-4'>الإجمالي: ${orderData.totalPrice}</p>
            `);
            form.reset();
            communeSelect.disabled = true;
            selectedRates = { home: 0, desk: 0 };
            updatePrices();
        } else {
            throw new Error(result.error || 'فشل إرسال الطلب');
        }
    } catch (err) {
        console.error('❌ Erreur:', err);
        showModal('error', `
            <p class='text-red-700 font-bold mb-2'>حدث خطأ أثناء إرسال الطلب</p>
            <p class='text-gray-600 text-sm'>${err.message}</p>
            <p class='text-gray-600 text-sm mt-2'>يرجى المحاولة مرة أخرى أو الاتصال على:<br><strong dir="ltr">+213 660 000 000</strong></p>
        `);
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
});


// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    loadDeliveryData();
    updatePrices();
});


// ✅ New logic using extracted_data.json
let deliveryData = [];

async function loadDeliveryData() {
  try {
    const response = await fetch('extracted_data.json');
    deliveryData = await response.json();
    populateWilayaSelect();
  } catch (error) {
    console.error('Error loading delivery data:', error);
    alert('⚠️ فشل تحميل بيانات التوصيل');
  }
}

function populateWilayaSelect() {
  const wilayaSelect = document.getElementById('wilaya');
  wilayaSelect.innerHTML = '<option value=\"\">اختر الولاية</option>';

  deliveryData.forEach(wilaya => {
    const option = document.createElement('option');
    option.value = wilaya.wilaya_code;
    option.textContent = `${wilaya.wilaya_code} - ${wilaya.wilaya_name}`;
    option.dataset.commune = wilaya.commune;
    option.dataset.rate = wilaya.rate;
    wilayaSelect.appendChild(option);
  });

  wilayaSelect.addEventListener('change', handleWilayaChange);
}

function handleWilayaChange(e) {
  const selectedOption = e.target.selectedOptions[0];
  const communeSelect = document.getElementById('commune');
  communeSelect.innerHTML = '<option value=\"\">اختر البلدية</option>';

  if (!selectedOption || !selectedOption.dataset.commune) {
    communeSelect.disabled = true;
    return;
  }

  const communes = selectedOption.dataset.commune.split(',').map(c => c.trim());
  communes.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c;
    opt.textContent = c;
    communeSelect.appendChild(opt);
  });
  communeSelect.disabled = false;

  updateDeliveryPrice(selectedOption.dataset.rate);
}

function parseRate(rateString) {
  const rates = rateString.replace(/\s/g, '').split(',');
  return {
    home: parseInt(rates[0]) || 0,
    stopdesk: parseInt(rates[1]) || 0
  };
}

function updateDeliveryPrice(rateString) {
  const rate = parseRate(rateString);
  const deliveryType = document.querySelector('input[name=\"deliveryType\"]:checked').value;
  const deliveryPrice = (deliveryType === 'home') ? rate.home : rate.stopdesk;
  const deliveryPriceEl = document.getElementById('deliveryPrice');
  const totalPriceEl = document.getElementById('totalPrice');

  deliveryPriceEl.textContent = `${deliveryPrice.toLocaleString()} د.ج`;
  const productPrice = 145000;
  totalPriceEl.textContent = `${(productPrice + deliveryPrice).toLocaleString()} د.ج`;
}

document.querySelectorAll('input[name=\"deliveryType\"]').forEach(radio => {
  radio.addEventListener('change', () => {
    const wilayaSelect = document.getElementById('wilaya');
    const selectedOption = wilayaSelect.selectedOptions[0];
    if (selectedOption && selectedOption.dataset.rate) {
      updateDeliveryPrice(selectedOption.dataset.rate);
    }
  });
});

loadDeliveryData();
