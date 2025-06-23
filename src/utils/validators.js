import validator from 'validator';
import { Types } from 'mongoose';

/**
 * Custom validation helpers
 */
export const validators = {
  /**
   * Validate MongoDB ObjectId
   */
  isValidObjectId(id) {
    return Types.ObjectId.isValid(id);
  },

  /**
   * Validate email
   */
  isValidEmail(email) {
    return validator.isEmail(email);
  },

  /**
   * Validate strong password
   */
  isStrongPassword(password) {
    return validator.isStrongPassword(password, {
      minLength: 8,
      minLowercase: 1,
      minUppercase: 1,
      minNumbers: 1,
      minSymbols: 1,
    });
  },

  /**
   * Validate URL
   */
  isValidUrl(url) {
    return validator.isURL(url);
  },

  /**
   * Validate phone number
   */
  isValidPhone(phone) {
    return validator.isMobilePhone(phone);
  },

  /**
   * Validate date
   */
  isValidDate(date) {
    return validator.isISO8601(date);
  },

  /**
   * Validate numeric
   */
  isNumeric(value) {
    return validator.isNumeric(value.toString());
  },

  /**
   * Validate positive number
   */
  isPositiveNumber(value) {
    return typeof value === 'number' && value > 0;
  },

  /**
   * Validate non-negative number
   */
  isNonNegativeNumber(value) {
    return typeof value === 'number' && value >= 0;
  },

  /**
   * Validate integer
   */
  isInteger(value) {
    return Number.isInteger(value);
  },

  /**
   * Validate array
   */
  isNonEmptyArray(value) {
    return Array.isArray(value) && value.length > 0;
  },

  /**
   * Validate string length
   */
  hasValidLength(value, min = 1, max = 255) {
    return typeof value === 'string' && 
           value.length >= min && 
           value.length <= max;
  },

  /**
   * Validate alphanumeric
   */
  isAlphanumeric(value) {
    return validator.isAlphanumeric(value);
  },

  /**
   * Validate slug
   */
  isValidSlug(value) {
    return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
  },

  /**
   * Validate hex color
   */
  isValidHexColor(value) {
    return validator.isHexColor(value);
  },

  /**
   * Validate credit card
   */
  isValidCreditCard(value) {
    return validator.isCreditCard(value);
  },

  /**
   * Validate JSON
   */
  isValidJSON(value) {
    try {
      JSON.parse(value);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Validate base64
   */
  isValidBase64(value) {
    return validator.isBase64(value);
  },

  /**
   * Validate IP address
   */
  isValidIP(value) {
    return validator.isIP(value);
  },

  /**
   * Validate MAC address
   */
  isValidMAC(value) {
    return validator.isMACAddress(value);
  },

  /**
   * Validate UUID
   */
  isValidUUID(value) {
    return validator.isUUID(value);
  },

  /**
   * Validate file extension
   */
  hasValidFileExtension(filename, allowedExtensions) {
    const extension = filename.split('.').pop().toLowerCase();
    return allowedExtensions.includes(extension);
  },

  /**
   * Validate file size
   */
  hasValidFileSize(size, maxSize) {
    return size <= maxSize;
  },

  /**
   * Validate mime type
   */
  hasValidMimeType(mimeType, allowedTypes) {
    return allowedTypes.includes(mimeType);
  },
};

/**
 * Sanitization helpers
 */
export const sanitizers = {
  /**
   * Sanitize HTML
   */
  sanitizeHtml(value) {
    return validator.escape(value);
  },

  /**
   * Normalize email
   */
  normalizeEmail(email) {
    return validator.normalizeEmail(email, {
      gmail_lowercase: true,
      gmail_remove_dots: false,
    });
  },

  /**
   * Trim whitespace
   */
  trim(value) {
    return typeof value === 'string' ? value.trim() : value;
  },

  /**
   * Remove special characters
   */
  removeSpecialChars(value) {
    return typeof value === 'string' ? value.replace(/[^a-zA-Z0-9\s]/g, '') : value;
  },

  /**
   * Create slug from string
   */
  createSlug(value) {
    return typeof value === 'string' ? 
      value.toLowerCase()
           .replace(/[^a-z0-9\s-]/g, '')
           .replace(/\s+/g, '-')
           .replace(/-+/g, '-')
           .trim('-') : 
      value;
  },

  /**
   * Limit string length
   */
  limitLength(value, maxLength) {
    return typeof value === 'string' && value.length > maxLength ? 
      value.substring(0, maxLength) : 
      value;
  },

  /**
   * Clean phone number
   */
  cleanPhoneNumber(phone) {
    return typeof phone === 'string' ? 
      phone.replace(/[^0-9+]/g, '') : 
      phone;
  },

  /**
   * Format currency
   */
  formatCurrency(amount, decimals = 2) {
    return typeof amount === 'number' ? 
      parseFloat(amount.toFixed(decimals)) : 
      amount;
  },
};

/**
 * Complex validation rules
 */
export const validationRules = {
  /**
   * User validation rules
   */
  user: {
    username: (value) => {
      return validators.hasValidLength(value, 3, 30) && 
             validators.isAlphanumeric(value);
    },
    email: (value) => {
      return validators.isValidEmail(value);
    },
    password: (value) => {
      return validators.isStrongPassword(value);
    },
  },

  /**
   * Product validation rules
   */
  product: {
    name: (value) => {
      return validators.hasValidLength(value, 1, 255);
    },
    price: (value) => {
      return validators.isPositiveNumber(value);
    },
    stock: (value) => {
      return validators.isInteger(value) && validators.isNonNegativeNumber(value);
    },
  },

  /**
   * Order validation rules
   */
  order: {
    items: (value) => {
      return validators.isNonEmptyArray(value);
    },
    total: (value) => {
      return validators.isPositiveNumber(value);
    },
  },
};

/**
 * Validation result builder
 */
export class ValidationResult {
  constructor() {
    this.errors = [];
    this.isValid = true;
  }

  addError(field, message, value = null) {
    this.errors.push({ field, message, value });
    this.isValid = false;
    return this;
  }

  hasErrors() {
    return !this.isValid;
  }

  getErrors() {
    return this.errors;
  }

  getFirstError() {
    return this.errors.length > 0 ? this.errors[0] : null;
  }
}

/**
 * Validate object against rules
 */
export const validateObject = (obj, rules) => {
  const result = new ValidationResult();

  Object.keys(rules).forEach(field => {
    const value = obj[field];
    const rule = rules[field];

    if (typeof rule === 'function') {
      if (!rule(value)) {
        result.addError(field, `Invalid ${field}`, value);
      }
    } else if (typeof rule === 'object') {
      const fieldResult = validateObject(value, rule);
      if (fieldResult.hasErrors()) {
        fieldResult.getErrors().forEach(error => {
          result.addError(`${field}.${error.field}`, error.message, error.value);
        });
      }
    }
  });

  return result;
};
