// page.js - UI/UX Features Only

// ============================================
// GALLERY FUNCTIONALITY
// ============================================
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

    if (slides[currentSlide]) slides[currentSlide].classList.add('active');
    if (thumbnails[currentSlide]) thumbnails[currentSlide].classList.add('active');
}

function changeSlide(direction) {
    showSlide(currentSlide + direction);
}

function goToSlide(index) {
    showSlide(index);
}

// Keyboard navigation for gallery
document.addEventListener('keydown', function(e) {
    if (e.key === 'ArrowLeft') {
        changeSlide(1);
    } else if (e.key === 'ArrowRight') {
        changeSlide(-1);
    }
});

// ============================================
// FAQ ACCORDION
// ============================================
function toggleFAQ(index) {
    const answer = document.getElementById(`faq-answer-${index}`);
    if (!answer) return;
    
    const question = answer.previousElementSibling;
    const icon = question.querySelector('.faq-icon');
    const isOpen = answer.classList.contains('open');

    // Close all other FAQs
    document.querySelectorAll('.faq-answer').forEach((item, i) => {
        if (i !== index) {
            item.classList.remove('open');
            const otherQuestion = item.previousElementSibling;
            const otherIcon = otherQuestion.querySelector('.faq-icon');
            if (otherIcon) otherIcon.style.transform = 'rotate(0deg)';
            otherQuestion.setAttribute('aria-expanded', 'false');
        }
    });

    // Toggle current FAQ
    if (isOpen) {
        answer.classList.remove('open');
        if (icon) icon.style.transform = 'rotate(0deg)';
        question.setAttribute('aria-expanded', 'false');
    } else {
        answer.classList.add('open');
        if (icon) icon.style.transform = 'rotate(180deg)';
        question.setAttribute('aria-expanded', 'true');
    }
}

// ============================================
// SMOOTH SCROLL FOR ANCHOR LINKS
// ============================================
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

// ============================================
// SCROLL ANIMATIONS
// ============================================
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

// Apply scroll animation to sections
document.querySelectorAll('section').forEach(section => {
    section.style.opacity = '0';
    section.style.transform = 'translateY(20px)';
    section.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(section);
});

// ============================================
// PRICE DISPLAY (Read-only, no form logic)
// ============================================
const productPriceBase = 145000;

function updateDisplayPrices() {
    const quantityInput = document.getElementById('quantity');
    const productPriceSpan = document.getElementById('productPrice');
    const deliveryPriceSpan = document.getElementById('deliveryPrice');
    const totalPriceSpan = document.getElementById('totalPrice');
    
    if (!quantityInput || !productPriceSpan) return;

    const quantity = Math.max(1, parseInt(quantityInput.value) || 1);
    const productPrice = productPriceBase * quantity;
    
    productPriceSpan.textContent = productPrice.toLocaleString() + ' د.ج';
    
    // Delivery price will be updated by main.js
    const deliveryPrice = parseInt(deliveryPriceSpan?.textContent.replace(/[^\d]/g, '')) || 0;
    const total = productPrice + deliveryPrice;
    
    if (totalPriceSpan) {
        totalPriceSpan.textContent = total.toLocaleString() + ' د.ج';
    }
}

// Listen to quantity changes
const quantityInput = document.getElementById('quantity');
if (quantityInput) {
    quantityInput.addEventListener('input', updateDisplayPrices);
    quantityInput.addEventListener('change', updateDisplayPrices);
}

// Initialize price display on load
document.addEventListener('DOMContentLoaded', updateDisplayPrices);
