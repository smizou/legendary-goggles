// ============================================
// LANDING PAGE CONTROLLER
// Modular JavaScript for multiple landing page variants
// ============================================

(function() {
    'use strict';

    // ============================================
    // CONFIGURATION
    // ============================================
    const CONFIG = {
        UNIT_PRICE: 8500,
        QUANTITY_MIN: 1,
        QUANTITY_MAX: 10,
        SWIPE_THRESHOLD: 50,
        SCROLL_ANIMATION: {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        }
    };

    // ============================================
    // QUANTITY CONTROLLER
    // ============================================
    const QuantityController = {
        init() {
            this.input = document.getElementById('quantity');
            this.decreaseBtn = document.getElementById('decreaseQty');
            this.increaseBtn = document.getElementById('increaseQty');

            if (!this.input || !this.decreaseBtn || !this.increaseBtn) return;

            this.attachEventListeners();
        },

        attachEventListeners() {
            this.decreaseBtn.addEventListener('click', () => this.decrease());
            this.increaseBtn.addEventListener('click', () => this.increase());
            this.input.addEventListener('change', () => PriceCalculator.update());
            this.input.addEventListener('input', () => PriceCalculator.update());
        },

        decrease() {
            const current = parseInt(this.input.value) || CONFIG.QUANTITY_MIN;
            if (current > CONFIG.QUANTITY_MIN) {
                this.input.value = current - 1;
                PriceCalculator.update();
            }
        },

        increase() {
            const current = parseInt(this.input.value) || CONFIG.QUANTITY_MIN;
            if (current < CONFIG.QUANTITY_MAX) {
                this.input.value = current + 1;
                PriceCalculator.update();
            }
        },

        getValue() {
            return parseInt(this.input.value) || CONFIG.QUANTITY_MIN;
        }
    };

    // ============================================
    // GALLERY CONTROLLER
    // ============================================
    const GalleryController = {
        currentSlide: 0,
        slides: [],
        thumbnails: [],
        dots: [],

        init() {
            this.slides = document.querySelectorAll('.gallery-slide');
            this.thumbnails = document.querySelectorAll('.thumbnail');
            this.dots = document.querySelectorAll('.gallery-dot');

            if (this.slides.length === 0) return;

            this.attachEventListeners();
            this.showSlide(0);
        },

        attachEventListeners() {
            // Keyboard navigation
            document.addEventListener('keydown', (e) => {
                if (e.key === 'ArrowLeft') this.changeSlide(1);
                else if (e.key === 'ArrowRight') this.changeSlide(-1);
            });

            // Touch swipe for mobile
            const container = document.querySelector('.gallery-container');
            if (container) {
                let touchStartX = 0;
                let touchEndX = 0;

                container.addEventListener('touchstart', (e) => {
                    touchStartX = e.changedTouches[0].screenX;
                }, { passive: true });

                container.addEventListener('touchend', (e) => {
                    touchEndX = e.changedTouches[0].screenX;
                    this.handleSwipe(touchStartX, touchEndX);
                }, { passive: true });
            }
        },

        handleSwipe(startX, endX) {
            const diff = startX - endX;
            if (Math.abs(diff) > CONFIG.SWIPE_THRESHOLD) {
                this.changeSlide(diff > 0 ? 1 : -1);
            }
        },

        changeSlide(direction) {
            this.showSlide(this.currentSlide + direction);
        },

        showSlide(index) {
            const totalSlides = this.slides.length;
            
            if (index >= totalSlides) {
                this.currentSlide = 0;
            } else if (index < 0) {
                this.currentSlide = totalSlides - 1;
            } else {
                this.currentSlide = index;
            }

            // Update slides
            this.slides.forEach(slide => slide.classList.remove('active'));
            if (this.slides[this.currentSlide]) {
                this.slides[this.currentSlide].classList.add('active');
            }

            // Update thumbnails
            this.thumbnails.forEach(thumb => thumb.classList.remove('active'));
            if (this.thumbnails[this.currentSlide]) {
                this.thumbnails[this.currentSlide].classList.add('active');
                this.scrollThumbnailIntoView(this.thumbnails[this.currentSlide]);
            }

            // Update dots
            this.dots.forEach((dot, i) => {
                dot.classList.toggle('active', i === this.currentSlide);
            });
        },

        scrollThumbnailIntoView(thumbnail) {
            if (window.innerWidth <= 768) {
                setTimeout(() => {
                    thumbnail.scrollIntoView({ 
                        behavior: 'smooth', 
                        inline: 'center', 
                        block: 'nearest' 
                    });
                }, 100);
            }
        },

        goToSlide(index) {
            this.showSlide(index);
        }
    };

    // ============================================
    // FAQ ACCORDION CONTROLLER
    // ============================================
    const FAQController = {
        init() {
            const faqItems = document.querySelectorAll('[data-faq-index]');
            if (faqItems.length === 0) return;

            faqItems.forEach((item, index) => {
                item.addEventListener('click', () => this.toggle(index));
            });
        },

        toggle(index) {
            const answer = document.getElementById(`faq-answer-${index}`);
            if (!answer) return;

            const question = answer.previousElementSibling;
            const icon = question?.querySelector('.faq-icon');
            const isOpen = answer.classList.contains('open');

            // Close all other FAQs
            this.closeAll(index);

            // Toggle current FAQ
            if (isOpen) {
                answer.classList.remove('open');
                if (icon) icon.style.transform = 'rotate(0deg)';
                if (question) question.setAttribute('aria-expanded', 'false');
            } else {
                answer.classList.add('open');
                if (icon) icon.style.transform = 'rotate(180deg)';
                if (question) question.setAttribute('aria-expanded', 'true');
            }
        },

        closeAll(exceptIndex) {
            document.querySelectorAll('.faq-answer').forEach((item, i) => {
                if (i !== exceptIndex) {
                    item.classList.remove('open');
                    const question = item.previousElementSibling;
                    const icon = question?.querySelector('.faq-icon');
                    if (icon) icon.style.transform = 'rotate(0deg)';
                    if (question) question.setAttribute('aria-expanded', 'false');
                }
            });
        }
    };

    // ============================================
    // PRICE CALCULATOR
    // ============================================
    const PriceCalculator = {
        deliveryRates: { home: 0, desk: 0 },

        init() {
            const wilayaSelect = document.getElementById('wilaya');
            const deliveryRadios = document.querySelectorAll('input[name="deliveryType"]');

            if (!wilayaSelect) return;

            wilayaSelect.addEventListener('change', () => {
                this.updateDeliveryRates(wilayaSelect);
                this.update();
            });

            deliveryRadios.forEach(radio => {
                radio.addEventListener('change', () => this.update());
            });

            this.update();
        },

        updateDeliveryRates(wilayaSelect) {
            const selected = wilayaSelect.selectedOptions[0];
            if (selected && selected.value && selected.dataset.rate) {
                const rates = selected.dataset.rate.replace(/\s/g, '').split(',');
                this.deliveryRates = {
                    home: parseInt(rates[0]) || 0,
                    desk: parseInt(rates[1]) || 0
                };
            } else {
                this.deliveryRates = { home: 0, desk: 0 };
            }
        },

        update() {
            const quantity = QuantityController.getValue();
            const deliveryType = document.querySelector('input[name="deliveryType"]:checked')?.value || 'home';
            const deliveryPrice = deliveryType === 'desk' ? this.deliveryRates.desk : this.deliveryRates.home;
            const productTotal = CONFIG.UNIT_PRICE * quantity;
            const totalPrice = productTotal + deliveryPrice;

            this.updateDisplay(productTotal, deliveryPrice, totalPrice);
        },

        updateDisplay(productTotal, deliveryPrice, totalPrice) {
            const productPriceEl = document.getElementById('productPrice');
            const deliveryPriceEl = document.getElementById('deliveryPrice');
            const totalPriceEl = document.getElementById('totalPrice');

            if (productPriceEl) {
                productPriceEl.textContent = this.formatPrice(productTotal);
            }
            if (deliveryPriceEl) {
                deliveryPriceEl.textContent = deliveryPrice ? this.formatPrice(deliveryPrice) : '-- د.ج';
            }
            if (totalPriceEl) {
                totalPriceEl.textContent = this.formatPrice(totalPrice);
            }
        },

        formatPrice(amount) {
            return amount.toLocaleString('ar-DZ') + ' د.ج';
        }
    };

    // ============================================
    // SMOOTH SCROLL CONTROLLER
    // ============================================
    const SmoothScrollController = {
        init() {
            document.querySelectorAll('a[href^="#"]').forEach(anchor => {
                anchor.addEventListener('click', (e) => {
                    e.preventDefault();
                    const target = document.querySelector(anchor.getAttribute('href'));
                    if (target) {
                        target.scrollIntoView({
                            behavior: 'smooth',
                            block: 'start'
                        });
                    }
                });
            });
        }
    };

    // ============================================
    // SCROLL ANIMATIONS CONTROLLER
    // ============================================
    const ScrollAnimationsController = {
        init() {
            const options = CONFIG.SCROLL_ANIMATION;
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.style.opacity = '1';
                        entry.target.style.transform = 'translateY(0)';
                    }
                });
            }, options);

            document.querySelectorAll('section').forEach(section => {
                section.style.opacity = '0';
                section.style.transform = 'translateY(20px)';
                section.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
                observer.observe(section);
            });
        }
    };

    // ============================================
    // GLOBAL FUNCTIONS (for backward compatibility)
    // ============================================
    window.changeSlide = (direction) => GalleryController.changeSlide(direction);
    window.goToSlide = (index) => GalleryController.goToSlide(index);
    window.showSlide = (index) => GalleryController.showSlide(index);
    window.toggleFAQ = (index) => FAQController.toggle(index);

    // ============================================
    // INITIALIZE APPLICATION
    // ============================================
    document.addEventListener('DOMContentLoaded', () => {
        QuantityController.init();
        GalleryController.init();
        FAQController.init();
        PriceCalculator.init();
        SmoothScrollController.init();
        ScrollAnimationsController.init();

        console.log('✅ Landing page initialized successfully');
    });

})();