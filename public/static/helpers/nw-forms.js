/**
 * ═══════════════════════════════════════════════════════════════════════════
 * NW_FORMS - Form Handling & Validation
 * ═══════════════════════════════════════════════════════════════════════════
 * Version: 2.0.0
 * 
 * Features:
 * - Form serialization & deserialization
 * - Validation rules (required, email, min, max, pattern, custom)
 * - Real-time validation feedback
 * - Form state management
 * - Input masking
 * - Auto-save to localStorage
 * - File input preview
 */

const NW_FORMS = (function() {
    'use strict';

    const VERSION = '2.0.0';

    // Built-in validation rules
    const validators = {
        required: (value) => {
            if (typeof value === 'boolean') return value;
            if (Array.isArray(value)) return value.length > 0;
            return value !== null && value !== undefined && String(value).trim() !== '';
        },
        email: (value) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
        url: (value) => !value || /^https?:\/\/.+/.test(value),
        number: (value) => !value || !isNaN(Number(value)),
        integer: (value) => !value || Number.isInteger(Number(value)),
        min: (value, min) => !value || Number(value) >= min,
        max: (value, max) => !value || Number(value) <= max,
        minLength: (value, min) => !value || String(value).length >= min,
        maxLength: (value, max) => !value || String(value).length <= max,
        pattern: (value, regex) => !value || new RegExp(regex).test(value),
        match: (value, fieldName, formData) => !value || value === formData[fieldName],
        phone: (value) => !value || /^[\d\s\-+()]{10,}$/.test(value),
        alphanumeric: (value) => !value || /^[a-zA-Z0-9]+$/.test(value),
        date: (value) => !value || !isNaN(Date.parse(value)),
        json: (value) => {
            if (!value) return true;
            try { JSON.parse(value); return true; } catch { return false; }
        }
    };

    // Default error messages
    const defaultMessages = {
        required: 'This field is required',
        email: 'Please enter a valid email',
        url: 'Please enter a valid URL',
        number: 'Please enter a valid number',
        integer: 'Please enter a whole number',
        min: 'Value must be at least {{min}}',
        max: 'Value must be at most {{max}}',
        minLength: 'Must be at least {{min}} characters',
        maxLength: 'Must be at most {{max}} characters',
        pattern: 'Invalid format',
        match: 'Fields do not match',
        phone: 'Please enter a valid phone number',
        alphanumeric: 'Only letters and numbers allowed',
        date: 'Please enter a valid date',
        json: 'Please enter valid JSON'
    };

    // ═══════════════════════════════════════════════════════════════════════════
    // STYLES
    // ═══════════════════════════════════════════════════════════════════════════

    function injectStyles() {
        if (document.getElementById('nw-forms-styles')) return;

        const styles = document.createElement('style');
        styles.id = 'nw-forms-styles';
        styles.textContent = `
            .nw-form-group {
                margin-bottom: 16px;
            }

            .nw-form-label {
                display: block;
                margin-bottom: 6px;
                font-size: 14px;
                font-weight: 500;
                color: rgba(255,255,255,0.9);
            }

            .nw-form-label .required {
                color: #ef4444;
                margin-left: 2px;
            }

            .nw-form-input {
                width: 100%;
                padding: 12px 16px;
                border: 1px solid rgba(255,255,255,0.2);
                border-radius: 8px;
                background: rgba(255,255,255,0.05);
                color: #fff;
                font-size: 14px;
                transition: all 0.2s;
            }

            .nw-form-input:focus {
                outline: none;
                border-color: #ff6b00;
                box-shadow: 0 0 0 3px rgba(255,107,0,0.2);
            }

            .nw-form-input::placeholder {
                color: rgba(255,255,255,0.4);
            }

            .nw-form-input.error {
                border-color: #ef4444;
            }

            .nw-form-input.success {
                border-color: #22c55e;
            }

            .nw-form-error {
                display: block;
                margin-top: 4px;
                font-size: 12px;
                color: #ef4444;
                opacity: 0;
                transform: translateY(-5px);
                transition: all 0.2s;
            }

            .nw-form-error.show {
                opacity: 1;
                transform: translateY(0);
            }

            .nw-form-hint {
                display: block;
                margin-top: 4px;
                font-size: 12px;
                color: rgba(255,255,255,0.5);
            }

            .nw-form-textarea {
                min-height: 100px;
                resize: vertical;
            }

            .nw-form-select {
                appearance: none;
                background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='white' viewBox='0 0 16 16'%3E%3Cpath d='M8 11L3 6h10l-5 5z'/%3E%3C/svg%3E");
                background-repeat: no-repeat;
                background-position: right 12px center;
                padding-right: 36px;
            }

            .nw-form-checkbox-group,
            .nw-form-radio-group {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }

            .nw-form-checkbox,
            .nw-form-radio {
                display: flex;
                align-items: center;
                gap: 8px;
                cursor: pointer;
            }

            .nw-form-checkbox input,
            .nw-form-radio input {
                width: 18px;
                height: 18px;
                accent-color: #ff6b00;
            }

            .nw-form-file {
                padding: 20px;
                border: 2px dashed rgba(255,255,255,0.2);
                border-radius: 8px;
                text-align: center;
                cursor: pointer;
                transition: all 0.2s;
            }

            .nw-form-file:hover {
                border-color: #ff6b00;
                background: rgba(255,107,0,0.05);
            }

            .nw-form-file.dragover {
                border-color: #ff6b00;
                background: rgba(255,107,0,0.1);
            }

            .nw-form-file-preview {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
                margin-top: 12px;
            }

            .nw-form-file-preview img {
                width: 60px;
                height: 60px;
                object-fit: cover;
                border-radius: 6px;
            }

            .nw-form-counter {
                font-size: 12px;
                color: rgba(255,255,255,0.5);
                text-align: right;
                margin-top: 4px;
            }

            .nw-form-counter.warning { color: #f59e0b; }
            .nw-form-counter.error { color: #ef4444; }

            .nw-form-submit {
                width: 100%;
                padding: 14px 24px;
                border: none;
                border-radius: 8px;
                background: linear-gradient(135deg, #ff6b00 0%, #ff9500 100%);
                color: #fff;
                font-size: 16px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s;
            }

            .nw-form-submit:hover:not(:disabled) {
                transform: translateY(-2px);
                box-shadow: 0 4px 20px rgba(255,107,0,0.4);
            }

            .nw-form-submit:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }

            .nw-form-submit.loading {
                position: relative;
                color: transparent;
            }

            .nw-form-submit.loading::after {
                content: '';
                position: absolute;
                top: 50%;
                left: 50%;
                width: 20px;
                height: 20px;
                margin: -10px 0 0 -10px;
                border: 2px solid rgba(255,255,255,0.3);
                border-top-color: #fff;
                border-radius: 50%;
                animation: nw-spin 0.6s linear infinite;
            }

            @keyframes nw-spin {
                to { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(styles);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // FORM SERIALIZATION
    // ═══════════════════════════════════════════════════════════════════════════

    /** Get all form data as object */
    function serialize(form) {
        const formEl = typeof form === 'string' ? document.querySelector(form) : form;
        if (!formEl) return {};

        const data = {};
        const formData = new FormData(formEl);

        for (const [key, value] of formData.entries()) {
            // Handle array fields (name="items[]")
            if (key.endsWith('[]')) {
                const cleanKey = key.slice(0, -2);
                if (!data[cleanKey]) data[cleanKey] = [];
                data[cleanKey].push(value);
            } else if (data[key]) {
                // Convert to array if duplicate keys
                if (!Array.isArray(data[key])) {
                    data[key] = [data[key]];
                }
                data[key].push(value);
            } else {
                data[key] = value;
            }
        }

        // Handle unchecked checkboxes
        formEl.querySelectorAll('input[type="checkbox"]').forEach(cb => {
            if (!cb.checked && !cb.name.endsWith('[]')) {
                data[cb.name] = false;
            } else if (cb.checked && !data[cb.name]) {
                data[cb.name] = cb.value === 'on' ? true : cb.value;
            }
        });

        return data;
    }

    /** Populate form with data */
    function deserialize(form, data) {
        const formEl = typeof form === 'string' ? document.querySelector(form) : form;
        if (!formEl || !data) return;

        Object.entries(data).forEach(([key, value]) => {
            const inputs = formEl.querySelectorAll(`[name="${key}"], [name="${key}[]"]`);
            
            inputs.forEach(input => {
                if (input.type === 'checkbox') {
                    if (Array.isArray(value)) {
                        input.checked = value.includes(input.value);
                    } else {
                        input.checked = Boolean(value);
                    }
                } else if (input.type === 'radio') {
                    input.checked = input.value === String(value);
                } else if (input.tagName === 'SELECT' && input.multiple) {
                    Array.from(input.options).forEach(opt => {
                        opt.selected = Array.isArray(value) ? value.includes(opt.value) : opt.value === value;
                    });
                } else {
                    input.value = value ?? '';
                }
            });
        });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // VALIDATION
    // ═══════════════════════════════════════════════════════════════════════════

    /** Validate single field */
    function validateField(value, rules, formData = {}) {
        const errors = [];

        for (const rule of rules) {
            let ruleName, ruleParam, message;

            if (typeof rule === 'string') {
                ruleName = rule;
            } else if (typeof rule === 'object') {
                ruleName = rule.rule;
                ruleParam = rule.param;
                message = rule.message;
            }

            const validator = validators[ruleName];
            if (!validator) continue;

            const isValid = validator(value, ruleParam, formData);
            
            if (!isValid) {
                const defaultMsg = defaultMessages[ruleName] || 'Invalid value';
                const errorMsg = (message || defaultMsg)
                    .replace('{{min}}', ruleParam)
                    .replace('{{max}}', ruleParam);
                errors.push(errorMsg);
                break; // Stop at first error
            }
        }

        return errors;
    }

    /** Validate entire form */
    function validate(form, schema) {
        const formEl = typeof form === 'string' ? document.querySelector(form) : form;
        if (!formEl) return { valid: false, errors: {} };

        const data = serialize(formEl);
        const errors = {};
        let valid = true;

        Object.entries(schema).forEach(([field, rules]) => {
            const fieldErrors = validateField(data[field], rules, data);
            if (fieldErrors.length > 0) {
                errors[field] = fieldErrors;
                valid = false;
            }
        });

        return { valid, errors, data };
    }

    /** Add custom validator */
    function addValidator(name, fn, message) {
        validators[name] = fn;
        if (message) defaultMessages[name] = message;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // REAL-TIME VALIDATION
    // ═══════════════════════════════════════════════════════════════════════════

    function attachValidation(form, schema, options = {}) {
        const formEl = typeof form === 'string' ? document.querySelector(form) : form;
        if (!formEl) return;

        const {
            validateOn = 'blur', // 'blur', 'input', 'change'
            showSuccessState = true,
            onFieldError = null,
            onFieldSuccess = null
        } = options;

        const showError = (input, errors) => {
            const group = input.closest('.nw-form-group') || input.parentElement;
            let errorEl = group.querySelector('.nw-form-error');

            input.classList.remove('success');
            input.classList.add('error');

            if (!errorEl) {
                errorEl = document.createElement('span');
                errorEl.className = 'nw-form-error';
                group.appendChild(errorEl);
            }

            errorEl.textContent = errors[0];
            requestAnimationFrame(() => errorEl.classList.add('show'));

            onFieldError?.(input, errors);
        };

        const clearError = (input) => {
            const group = input.closest('.nw-form-group') || input.parentElement;
            const errorEl = group.querySelector('.nw-form-error');

            input.classList.remove('error');
            if (showSuccessState && input.value) {
                input.classList.add('success');
            }

            if (errorEl) {
                errorEl.classList.remove('show');
            }

            onFieldSuccess?.(input);
        };

        const validateInput = (input) => {
            const rules = schema[input.name];
            if (!rules) return true;

            const data = serialize(formEl);
            const errors = validateField(data[input.name], rules, data);

            if (errors.length > 0) {
                showError(input, errors);
                return false;
            } else {
                clearError(input);
                return true;
            }
        };

        // Attach listeners
        Object.keys(schema).forEach(fieldName => {
            const input = formEl.querySelector(`[name="${fieldName}"]`);
            if (!input) return;

            input.addEventListener(validateOn, () => validateInput(input));

            // Always validate on submit
            if (validateOn !== 'input') {
                input.addEventListener('input', () => {
                    if (input.classList.contains('error')) {
                        validateInput(input);
                    }
                });
            }
        });

        // Return validation function
        return () => {
            let allValid = true;
            Object.keys(schema).forEach(fieldName => {
                const input = formEl.querySelector(`[name="${fieldName}"]`);
                if (input && !validateInput(input)) {
                    allValid = false;
                }
            });
            return allValid;
        };
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // INPUT MASKING
    // ═══════════════════════════════════════════════════════════════════════════

    function mask(input, pattern) {
        const inputEl = typeof input === 'string' ? document.querySelector(input) : input;
        if (!inputEl) return;

        inputEl.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '');
            let result = '';
            let valueIndex = 0;

            for (let i = 0; i < pattern.length && valueIndex < value.length; i++) {
                if (pattern[i] === '#') {
                    result += value[valueIndex++];
                } else {
                    result += pattern[i];
                    if (value[valueIndex] === pattern[i]) valueIndex++;
                }
            }

            e.target.value = result;
        });
    }

    // Common masks
    const masks = {
        phone: '(###) ###-####',
        date: '##/##/####',
        ssn: '###-##-####',
        zip: '#####',
        creditCard: '#### #### #### ####',
        time: '##:##'
    };

    // ═══════════════════════════════════════════════════════════════════════════
    // AUTO-SAVE
    // ═══════════════════════════════════════════════════════════════════════════

    function autoSave(form, key, options = {}) {
        const formEl = typeof form === 'string' ? document.querySelector(form) : form;
        if (!formEl) return;

        const {
            debounceMs = 500,
            exclude = [],
            onSave = null,
            onRestore = null
        } = options;

        const storageKey = `nw_form_${key}`;
        let timeout;

        // Save handler
        const save = () => {
            const data = serialize(formEl);
            exclude.forEach(field => delete data[field]);
            localStorage.setItem(storageKey, JSON.stringify(data));
            onSave?.(data);
        };

        // Attach save listeners
        formEl.addEventListener('input', () => {
            clearTimeout(timeout);
            timeout = setTimeout(save, debounceMs);
        });

        formEl.addEventListener('change', save);

        // Restore on init
        const restore = () => {
            const saved = localStorage.getItem(storageKey);
            if (saved) {
                try {
                    const data = JSON.parse(saved);
                    deserialize(formEl, data);
                    onRestore?.(data);
                    return true;
                } catch {}
            }
            return false;
        };

        // Clear saved data
        const clear = () => {
            localStorage.removeItem(storageKey);
        };

        return { restore, clear, save };
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // FILE INPUT PREVIEW
    // ═══════════════════════════════════════════════════════════════════════════

    function filePreview(input, previewContainer, options = {}) {
        const inputEl = typeof input === 'string' ? document.querySelector(input) : input;
        const previewEl = typeof previewContainer === 'string' ? document.querySelector(previewContainer) : previewContainer;
        if (!inputEl || !previewEl) return;

        const {
            maxSize = 5 * 1024 * 1024, // 5MB
            allowedTypes = ['image/*'],
            onError = null,
            onSelect = null
        } = options;

        inputEl.addEventListener('change', (e) => {
            previewEl.innerHTML = '';
            const files = Array.from(e.target.files);

            files.forEach(file => {
                // Validate size
                if (file.size > maxSize) {
                    onError?.(`File "${file.name}" exceeds ${maxSize / 1024 / 1024}MB limit`);
                    return;
                }

                // Validate type
                const typeAllowed = allowedTypes.some(type => {
                    if (type.endsWith('/*')) {
                        return file.type.startsWith(type.replace('/*', ''));
                    }
                    return file.type === type;
                });

                if (!typeAllowed) {
                    onError?.(`File type "${file.type}" not allowed`);
                    return;
                }

                // Create preview for images
                if (file.type.startsWith('image/')) {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        const img = document.createElement('img');
                        img.src = e.target.result;
                        previewEl.appendChild(img);
                    };
                    reader.readAsDataURL(file);
                } else {
                    const div = document.createElement('div');
                    div.textContent = file.name;
                    div.style.cssText = 'padding: 8px; background: rgba(255,255,255,0.1); border-radius: 4px;';
                    previewEl.appendChild(div);
                }
            });

            onSelect?.(files);
        });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // CHARACTER COUNTER
    // ═══════════════════════════════════════════════════════════════════════════

    function charCounter(input, maxLength, options = {}) {
        const inputEl = typeof input === 'string' ? document.querySelector(input) : input;
        if (!inputEl) return;

        const {
            warningThreshold = 0.8,
            containerClass = 'nw-form-counter'
        } = options;

        const counter = document.createElement('div');
        counter.className = containerClass;
        inputEl.parentElement.appendChild(counter);

        const update = () => {
            const length = inputEl.value.length;
            const remaining = maxLength - length;
            counter.textContent = `${length} / ${maxLength}`;

            counter.classList.remove('warning', 'error');
            if (length >= maxLength) {
                counter.classList.add('error');
            } else if (length >= maxLength * warningThreshold) {
                counter.classList.add('warning');
            }
        };

        inputEl.addEventListener('input', update);
        update();

        return { update };
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // INITIALIZATION
    // ═══════════════════════════════════════════════════════════════════════════

    function init() {
        injectStyles();
        console.log(`[NW_FORMS] v${VERSION} initialized`);
    }

    // Auto-init
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // PUBLIC API
    // ═══════════════════════════════════════════════════════════════════════════

    return {
        VERSION,
        
        // Serialization
        serialize, deserialize,
        
        // Validation
        validate, validateField, attachValidation, addValidator,
        
        // Masking
        mask, masks,
        
        // Auto-save
        autoSave,
        
        // File preview
        filePreview,
        
        // Counter
        charCounter
    };
})();

window.NW_FORMS = NW_FORMS;
