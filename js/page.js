// page.js - UI/UX Features & Price Calculator

document.addEventListener('DOMContentLoaded', function() {
            const quantityInput = document.getElementById('quantity');
            const decreaseBtn = document.getElementById('decreaseQty');
            const increaseBtn = document.getElementById('increaseQty');

            decreaseBtn.addEventListener('click', function() {
                let currentValue = parseInt(quantityInput.value);
                if (currentValue > 1) {
                    quantityInput.value = currentValue - 1;
                }
            });

            increaseBtn.addEventListener('click', function() {
                let currentValue = parseInt(quantityInput.value);
                if (currentValue < 10) {
                    quantityInput.value = currentValue + 1;
                }
            });
        });

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
// PRICE CALCULATION
// ============================================
const UNIT_PRICE = 145000;
let deliveryRates = { home: 0, desk: 0 };

// Listen to wilaya changes
document.getElementById("wilaya").addEventListener("change", function () {
    const selected = this.selectedOptions[0];
    if (selected && selected.value) {
        const rateString = selected.dataset.rate;
        if (rateString) {
            const rates = rateString.replace(/\s/g, "").split(",");
            deliveryRates = {
                home: parseInt(rates[0]) || 0,
                desk: parseInt(rates[1]) || 0,
            };
        }
    } else {
        deliveryRates = { home: 0, desk: 0 };
    }
    updatePrices();
});

// Listen to delivery type changes
document.querySelectorAll('input[name="deliveryType"]').forEach((radio) => {
    radio.addEventListener("change", updatePrices);
});

// Listen to quantity changes
document.getElementById("quantity").addEventListener("change", updatePrices);
document.getElementById("quantity").addEventListener("input", updatePrices);

// Update all prices
function updatePrices() {
    const quantity = parseInt(document.getElementById("quantity").value) || 1;
    const deliveryType = document.querySelector('input[name="deliveryType"]:checked').value;
    const deliveryPrice = deliveryType === "desk" ? deliveryRates.desk : deliveryRates.home;
    const productTotal = UNIT_PRICE * quantity;
    const totalPrice = productTotal + deliveryPrice;

    document.getElementById("productPrice").textContent = productTotal.toLocaleString() + " د.ج";
    document.getElementById("deliveryPrice").textContent = deliveryPrice
        ? deliveryPrice.toLocaleString() + " د.ج"
        : "-- د.ج";
    document.getElementById("totalPrice").textContent = totalPrice.toLocaleString() + " د.ج";
}

// Initialize prices on load
updatePrices();


// ============================================
// MOBILE GALLERY ENHANCEMENTS
// ============================================

// Only run if gallery exists on the page
if (document.querySelector('.gallery-container')) {
    
    // Touch swipe support for mobile
    let touchStartX = 0;
    let touchEndX = 0;
    const galleryContainer = document.querySelector('.gallery-container');

    if (galleryContainer) {
        galleryContainer.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
        }, { passive: true });

        galleryContainer.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            handleGallerySwipe();
        }, { passive: true });

        function handleGallerySwipe() {
            const swipeThreshold = 50;
            const diff = touchStartX - touchEndX;

            if (Math.abs(diff) > swipeThreshold) {
                if (diff > 0) {
                    changeSlide(1);  // Swipe left = next
                } else {
                    changeSlide(-1); // Swipe right = previous
                }
            }
        }
    }

    // Enhance the existing showSlide function to update dots
    const originalShowSlide = window.showSlide || showSlide;
    window.showSlide = function(index) {
        // Call original function
        if (typeof originalShowSlide === 'function') {
            originalShowSlide(index);
        }
        
        // Update dots if they exist
        const dots = document.querySelectorAll('.gallery-dot');
        if (dots.length > 0) {
            dots.forEach((dot, i) => {
                dot.classList.toggle('active', i === currentSlide);
            });
        }

        // Auto-scroll active thumbnail on mobile
        const activeThumbnail = document.querySelector('.thumbnail.active');
        if (activeThumbnail && window.innerWidth <= 768) {
            setTimeout(() => {
                activeThumbnail.scrollIntoView({ 
                    behavior: 'smooth', 
                    inline: 'center', 
                    block: 'nearest' 
                });
            }, 100);
        }
    };
} 
