// ============================================
// ANIMATION SYSTEM - Premium UX Enhancements
// ============================================

const AnimationManager = {
    // Animated Background System - Optimized for Performance
    initAnimatedBackground() {
        // Disable background particle animations on mobile to prevent Lighthouse freeze
        if (typeof window.innerWidth !== 'undefined' && window.innerWidth < 768) {
            return;
        }
        
        // Skip if user prefers reduced motion
        if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            return;
        }
        
        // Only initialize if user is signed in (reduce load on auth page)
        const userPage = document.querySelector('.user-page');
        if (!userPage) {
            return;
        }
        
        const canvas = document.createElement('canvas');
        canvas.id = 'animated-background';
        canvas.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 0;
            opacity: 0.6;
        `;
        
        const container = document.querySelector('.user-page');
        if (container) {
            container.insertBefore(canvas, container.firstChild);
        }
        
        const ctx = canvas.getContext('2d');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        
        // Enhanced gaming-style particle system - Optimized counts
        const particles = [];
        const floatingShapes = [];
        // Reduced particle count for better performance
        const particleCount = window.innerWidth < 1024 ? 35 : 50;
        const shapeCount = window.innerWidth < 1024 ? 5 : 10;
        
        class Particle {
            constructor() {
                this.reset();
            }
            
            reset() {
                this.x = Math.random() * canvas.width;
                this.y = Math.random() * canvas.height;
                this.size = Math.random() * 3 + 1;
                this.speedX = (Math.random() - 0.5) * 0.8;
                this.speedY = (Math.random() - 0.5) * 0.8;
                this.opacity = Math.random() * 0.5 + 0.3;
                this.pulseSpeed = Math.random() * 0.02 + 0.01;
                this.pulsePhase = Math.random() * Math.PI * 2;
                const colors = [
                    `rgba(0, 212, 255, ${this.opacity})`,
                    `rgba(165, 94, 234, ${this.opacity})`,
                    `rgba(46, 213, 115, ${this.opacity * 0.7})`,
                    `rgba(255, 107, 53, ${this.opacity * 0.6})`
                ];
                this.color = colors[Math.floor(Math.random() * colors.length)];
            }
            
            update() {
                this.x += this.speedX;
                this.y += this.speedY;
                
                // Wrap around edges for smooth continuous movement
                if (this.x < 0) this.x = canvas.width;
                if (this.x > canvas.width) this.x = 0;
                if (this.y < 0) this.y = canvas.height;
                if (this.y > canvas.height) this.y = 0;
                
                // Pulse effect
                this.pulsePhase += this.pulseSpeed;
                const pulse = Math.sin(this.pulsePhase) * 0.3 + 1;
                this.currentSize = this.size * pulse;
            }
            
            draw() {
                // Glow effect for particles
                ctx.shadowBlur = 8;
                ctx.shadowColor = this.color;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.currentSize, 0, Math.PI * 2);
                ctx.fillStyle = this.color;
                ctx.fill();
                ctx.shadowBlur = 0;
            }
        }
        
        class FloatingShape {
            constructor() {
                this.reset();
            }
            
            reset() {
                this.x = Math.random() * canvas.width;
                this.y = Math.random() * canvas.height;
                this.size = Math.random() * 30 + 20;
                this.speedX = (Math.random() - 0.5) * 0.3;
                this.speedY = (Math.random() - 0.5) * 0.3;
                this.rotation = 0;
                this.rotationSpeed = (Math.random() - 0.5) * 0.02;
                this.opacity = Math.random() * 0.1 + 0.05;
                this.shape = Math.random() > 0.5 ? 'circle' : 'triangle';
                const colors = [
                    `rgba(0, 212, 255, ${this.opacity})`,
                    `rgba(165, 94, 234, ${this.opacity})`
                ];
                this.color = colors[Math.floor(Math.random() * colors.length)];
            }
            
            update() {
                this.x += this.speedX;
                this.y += this.speedY;
                this.rotation += this.rotationSpeed;
                
                // Wrap around edges
                if (this.x < -this.size) this.x = canvas.width + this.size;
                if (this.x > canvas.width + this.size) this.x = -this.size;
                if (this.y < -this.size) this.y = canvas.height + this.size;
                if (this.y > canvas.height + this.size) this.y = -this.size;
            }
            
            draw() {
                ctx.save();
                ctx.translate(this.x, this.y);
                ctx.rotate(this.rotation);
                ctx.globalAlpha = this.opacity;
                
                if (this.shape === 'circle') {
                    ctx.beginPath();
                    ctx.arc(0, 0, this.size, 0, Math.PI * 2);
                    ctx.strokeStyle = this.color;
                    ctx.lineWidth = 1;
                    ctx.stroke();
                } else {
                    ctx.beginPath();
                    ctx.moveTo(0, -this.size);
                    ctx.lineTo(-this.size * 0.8, this.size * 0.8);
                    ctx.lineTo(this.size * 0.8, this.size * 0.8);
                    ctx.closePath();
                    ctx.strokeStyle = this.color;
                    ctx.lineWidth = 1;
                    ctx.stroke();
                }
                
                ctx.globalAlpha = 1;
                ctx.restore();
            }
        }
        
        // Initialize particles
        for (let i = 0; i < particleCount; i++) {
            particles.push(new Particle());
        }
        
        // Initialize floating shapes
        for (let i = 0; i < shapeCount; i++) {
            floatingShapes.push(new FloatingShape());
        }
        
        // Draw grid pattern
        function drawGrid() {
            const gridSize = 100;
            const gridOpacity = 0.008;
            
            ctx.strokeStyle = `rgba(0, 212, 255, ${gridOpacity})`;
            ctx.lineWidth = 0.5;
            
            // Vertical lines
            for (let x = 0; x < canvas.width; x += gridSize) {
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, canvas.height);
                ctx.stroke();
            }
            
            // Horizontal lines
            for (let y = 0; y < canvas.height; y += gridSize) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(canvas.width, y);
                ctx.stroke();
            }
        }
        
        // Enhanced connection lines with gradient
        function drawConnections() {
            for (let i = 0; i < particles.length; i++) {
                for (let j = i + 1; j < particles.length; j++) {
                    const dx = particles[i].x - particles[j].x;
                    const dy = particles[i].y - particles[j].y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    if (distance < 180) {
                        const opacity = 0.2 * (1 - distance / 180);
                        const gradient = ctx.createLinearGradient(
                            particles[i].x, particles[i].y,
                            particles[j].x, particles[j].y
                        );
                        gradient.addColorStop(0, `rgba(0, 212, 255, ${opacity})`);
                        gradient.addColorStop(1, `rgba(165, 94, 234, ${opacity})`);
                        
                        ctx.beginPath();
                        ctx.strokeStyle = gradient;
                        ctx.lineWidth = 1.5;
                        ctx.moveTo(particles[i].x, particles[i].y);
                        ctx.lineTo(particles[j].x, particles[j].y);
                        ctx.stroke();
                    }
                }
            }
        }
        
        // Animation loop with performance optimization
        let animationId;
        let lastTime = 0;
        const targetFPS = 24; // Reduced to 24 FPS for better performance
        const frameInterval = 1000 / targetFPS;
        let isPaused = false;
        
        // Pause animation when page is not visible
        document.addEventListener('visibilitychange', () => {
            isPaused = document.hidden;
        });
        
        function animate(currentTime) {
            if (isPaused) {
                animationId = requestAnimationFrame(animate);
                return;
            }
            
            if (currentTime - lastTime >= frameInterval) {
                // Clear completely - NO overlay fill that causes blur
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                
                // Draw grid (only every 2 frames for performance) - REDUCED OPACITY
                if (Math.floor(currentTime / 100) % 2 === 0) {
                    drawGrid();
                }
                
                // Draw floating shapes
                floatingShapes.forEach(shape => {
                    shape.update();
                    shape.draw();
                });
                
                // Draw connections (optimized - only draw every other frame)
                if (Math.floor(currentTime / 50) % 2 === 0) {
                    drawConnections();
                }
                
                // Draw particles
                particles.forEach(particle => {
                    particle.update();
                    particle.draw();
                });
                
                lastTime = currentTime;
            }
            
            animationId = requestAnimationFrame(animate);
        }
        
        // Check for reduced motion preference
        if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            // Don't start animation if user prefers reduced motion
            return;
        }
        
        // Handle resize with smooth transitions
        let resizeTimeout;
        function handleResize() {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                const oldWidth = canvas.width;
                const oldHeight = canvas.height;
                canvas.width = window.innerWidth;
                canvas.height = window.innerHeight;
                
                // Adjust particle positions proportionally
                if (oldWidth > 0 && oldHeight > 0) {
                    const scaleX = canvas.width / oldWidth;
                    const scaleY = canvas.height / oldHeight;
                    particles.forEach(p => {
                        p.x *= scaleX;
                        p.y *= scaleY;
                    });
                    floatingShapes.forEach(s => {
                        s.x *= scaleX;
                        s.y *= scaleY;
                    });
                } else {
                    // First resize - reset positions
                    particles.forEach(p => p.reset());
                    floatingShapes.forEach(s => s.reset());
                }
            }, 150);
        }
        
        window.addEventListener('resize', handleResize);
        
        // Check for reduced motion preference before starting animation
        if (!window.matchMedia || !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            animationId = requestAnimationFrame(animate);
        }
        
        // Store cleanup function
        this.cleanupBackground = () => {
            if (animationId) cancelAnimationFrame(animationId);
            if (resizeTimeout) clearTimeout(resizeTimeout);
            window.removeEventListener('resize', handleResize);
            if (canvas && canvas.parentNode) {
                canvas.parentNode.removeChild(canvas);
            }
        };
    },
    
    // Staggered card animations on page load
    animateCardsOnLoad() {
        // Reduce animation delay on mobile for faster perceived performance
        const isMobile = window.innerWidth <= 768;
        const delayMultiplier = isMobile ? 50 : 100;
        
        const cards = document.querySelectorAll('.overview-card, .content-card, .chart-card');
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry, index) => {
                if (entry.isIntersecting) {
                    setTimeout(() => {
                        entry.target.style.opacity = '0';
                        entry.target.style.transform = 'translateY(30px)';
                        entry.target.style.transition = `all ${isMobile ? '0.4s' : '0.6s'} cubic-bezier(0.16, 1, 0.3, 1)`;
                        
                        requestAnimationFrame(() => {
                            entry.target.style.opacity = '1';
                            entry.target.style.transform = 'translateY(0)';
                        });
                    }, index * delayMultiplier);
                    
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1 });
        
        cards.forEach(card => {
            card.style.opacity = '0';
            observer.observe(card);
        });
    },
    
    // Enhanced button press animation
    initButtonAnimations() {
        document.addEventListener('click', (e) => {
            const button = e.target.closest('.btn, .btn-primary, .btn-secondary, .add-btn, .header-btn');
            if (button && !button.disabled) {
                const ripple = document.createElement('span');
                const rect = button.getBoundingClientRect();
                const size = Math.max(rect.width, rect.height);
                const x = e.clientX - rect.left - size / 2;
                const y = e.clientY - rect.top - size / 2;
                
                ripple.style.cssText = `
                    position: absolute;
                    width: ${size}px;
                    height: ${size}px;
                    left: ${x}px;
                    top: ${y}px;
                    border-radius: 50%;
                    background: rgba(255, 255, 255, 0.3);
                    transform: scale(0);
                    animation: ripple 0.6s ease-out;
                    pointer-events: none;
                `;
                
                button.style.position = 'relative';
                button.style.overflow = 'hidden';
                button.appendChild(ripple);
                
                setTimeout(() => ripple.remove(), 600);
            }
        });
        
        // Add ripple animation keyframes if not exists
        if (!document.getElementById('ripple-keyframes')) {
            const style = document.createElement('style');
            style.id = 'ripple-keyframes';
            style.textContent = `
                @keyframes ripple {
                    to {
                        transform: scale(2);
                        opacity: 0;
                    }
                }
            `;
            document.head.appendChild(style);
        }
    },
    
    // Progress bar smooth animation
    animateProgressBar(element, targetValue) {
        if (!element) return;
        
        const currentWidth = parseFloat(element.style.width) || 0;
        const startTime = performance.now();
        const duration = 800;
        
        function animate(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function (ease-out cubic)
            const easeOutCubic = 1 - Math.pow(1 - progress, 3);
            const currentValue = currentWidth + (targetValue - currentWidth) * easeOutCubic;
            
            element.style.width = `${currentValue}%`;
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        }
        
        requestAnimationFrame(animate);
    },
    
    // Number counter animation
    animateCounter(element, targetValue, duration = 1000, prefix = '$', suffix = '') {
        if (!element) return;
        
        const startValue = parseFloat(element.textContent.replace(/[^0-9.-]/g, '')) || 0;
        const startTime = performance.now();
        
        function animate(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function
            const easeOutCubic = 1 - Math.pow(1 - progress, 3);
            const currentValue = startValue + (targetValue - startValue) * easeOutCubic;
            
            element.textContent = `${prefix}${Math.abs(currentValue).toLocaleString('en-US', { 
                minimumFractionDigits: 2, 
                maximumFractionDigits: 2 
            })}${suffix}`;
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                element.textContent = `${prefix}${Math.abs(targetValue).toLocaleString('en-US', { 
                    minimumFractionDigits: 2, 
                    maximumFractionDigits: 2 
                })}${suffix}`;
            }
        }
        
        requestAnimationFrame(animate);
    }
};

// ============================================
// AUTH UX ENHANCEMENTS
// ============================================

const AuthAnimations = {
    // Form entrance animation
    initFormAnimations() {
        const authModal = document.getElementById('auth-modal');
        if (!authModal) return;
        
        // Observe modal open events
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.attributeName === 'class') {
                    const isActive = authModal.classList.contains('active');
                    if (isActive && !authModal.dataset.animated) {
                        authModal.dataset.animated = 'true';
                        
                        // Animate modal entrance
                        requestAnimationFrame(() => {
                            authModal.style.transition = 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)';
                        });
                        
                        // Animate form fields
                        const inputs = authModal.querySelectorAll('.input');
                        inputs.forEach((input, index) => {
                            input.style.opacity = '0';
                            input.style.transform = 'translateY(10px)';
                            
                            setTimeout(() => {
                                input.style.transition = 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)';
                                input.style.opacity = '1';
                                input.style.transform = 'translateY(0)';
                            }, 200 + (index * 100));
                        });
                    } else if (!isActive) {
                        authModal.dataset.animated = 'false';
                    }
                }
            });
        });
        
        observer.observe(authModal, { attributes: true });
        
        // Input focus animations
        const inputs = document.querySelectorAll('#auth-modal .input');
        inputs.forEach(input => {
            input.addEventListener('focus', function() {
                this.parentElement.classList.add('focused');
            });
            
            input.addEventListener('blur', function() {
                if (!this.value) {
                    this.parentElement.classList.remove('focused');
                }
            });
            
            // Animate on input
            input.addEventListener('input', function() {
                if (this.value) {
                    this.style.transform = 'scale(1.02)';
                    setTimeout(() => {
                        this.style.transform = 'scale(1)';
                    }, 200);
                }
            });
        });
    },
    
    // Loading spinner component
    showAuthLoading() {
        const loadingDiv = document.getElementById('auth-loading');
        const submitBtn = document.getElementById('auth-submit-btn');
        
        if (loadingDiv) {
            loadingDiv.innerHTML = `
                <div class="auth-spinner-container">
                    <div class="auth-spinner"></div>
                    <p>Processing...</p>
                </div>
            `;
            loadingDiv.style.display = 'block';
            loadingDiv.style.opacity = '0';
            loadingDiv.style.transition = 'opacity 0.3s ease';
            
            requestAnimationFrame(() => {
                loadingDiv.style.opacity = '1';
            });
        }
        
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.style.opacity = '0.6';
            submitBtn.style.transform = 'scale(0.98)';
        }
    },
    
    hideAuthLoading() {
        const loadingDiv = document.getElementById('auth-loading');
        const submitBtn = document.getElementById('auth-submit-btn');
        
        if (loadingDiv) {
            loadingDiv.style.opacity = '0';
            setTimeout(() => {
                loadingDiv.style.display = 'none';
            }, 300);
        }
        
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.style.opacity = '1';
            submitBtn.style.transform = 'scale(1)';
        }
    },
    
    // Success/Error animations
    showAuthSuccess(message) {
        const errorDiv = document.getElementById('auth-error');
        if (errorDiv) {
            const successMsg = message || '✓ Success!';
            errorDiv.innerHTML = `<div class="auth-success-message">${successMsg}</div>`;
            errorDiv.style.display = 'block';
            errorDiv.style.opacity = '0';
            errorDiv.style.transform = 'translateY(-10px)';
            
            requestAnimationFrame(() => {
                errorDiv.style.transition = 'all 0.3s ease';
                errorDiv.style.opacity = '1';
                errorDiv.style.transform = 'translateY(0)';
            });
            
            setTimeout(() => {
                errorDiv.style.opacity = '0';
                setTimeout(() => errorDiv.style.display = 'none', 300);
            }, 2000);
        }
    },
    
    showAuthError(message) {
        const errorDiv = document.getElementById('auth-error');
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';
            errorDiv.style.opacity = '0';
            errorDiv.style.transform = 'translateY(-10px)';
            errorDiv.style.animation = 'shake 0.5s ease';
            
            requestAnimationFrame(() => {
                errorDiv.style.transition = 'all 0.3s ease';
                errorDiv.style.opacity = '1';
                errorDiv.style.transform = 'translateY(0)';
            });
        }
    }
};

// Enhanced cursor-following animation for auth page (Gaming-style)
function initAuthCursorAnimation() {
    const authModal = document.getElementById('auth-modal');
    const welcomeScreen = document.querySelector('.welcome-screen');
    
    if (!authModal && !welcomeScreen) return;
    
    // Skip on mobile for performance
    if (window.innerWidth <= 768) return;
    
    const container = authModal || welcomeScreen;
    let mouseX = 0;
    let mouseY = 0;
    let particles = [];
    
    // Minimal dot-follow effect - lightweight particles only
    function createParticle(x, y) {
        return {
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 0.3,
            vy: (Math.random() - 0.5) * 0.3,
            life: 1.0,
            decay: 0.02,
            size: Math.random() * 2 + 1,
            opacity: 0.3
        };
    }
    
    // Track mouse movement - minimal dot trail
    container.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
        
        // Create minimal particles (limit for performance)
        if (particles.length < 8) {
            particles.push(createParticle(mouseX, mouseY));
        }
    });
    
    // Remove magnetic hover effects - too heavy
    
    // Animation loop for cursor particles
    function animateCursor() {
        const canvas = document.getElementById('auth-cursor-canvas');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        
        // Clear completely - NO overlay fill
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Minimal dot-follow effect - simple dots only
        particles = particles.filter(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.life -= p.decay;
            p.opacity = p.life * p.opacity;
            
            if (p.life > 0 && p.opacity > 0) {
                ctx.fillStyle = `rgba(0, 212, 255, ${p.opacity})`;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
                return true;
            }
            return false;
        });
        
        requestAnimationFrame(animateCursor);
    }
    
    // Create canvas for cursor animation
    const cursorCanvas = document.createElement('canvas');
    cursorCanvas.id = 'auth-cursor-canvas';
    cursorCanvas.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 9998;
    `;
    cursorCanvas.width = window.innerWidth;
    cursorCanvas.height = window.innerHeight;
    document.body.appendChild(cursorCanvas);
    
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            cursorCanvas.width = window.innerWidth;
            cursorCanvas.height = window.innerHeight;
        }, 150);
    });
    
    animateCursor();
}

// Initialize animations on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        // Only init background animation if user is signed in
        const userPage = document.querySelector('.user-page');
        if (userPage) {
            AnimationManager.initAnimatedBackground();
        }
        
        // Init cursor animation for auth page
        initAuthCursorAnimation();
        
        AnimationManager.initButtonAnimations();
        AnimationManager.animateCardsOnLoad();
        AuthAnimations.initFormAnimations();
    });
} else {
    const userPage = document.querySelector('.user-page');
    if (userPage) {
        AnimationManager.initAnimatedBackground();
    }
    
    initAuthCursorAnimation();
    AnimationManager.initButtonAnimations();
    AnimationManager.animateCardsOnLoad();
    AuthAnimations.initFormAnimations();
}

// ===== FINAL GLOBAL EXPORTS (CRITICAL) =====
window.AnimationManager = AnimationManager;
window.AuthAnimations = AuthAnimations;

