import { Types } from 'mongoose';

/**
 * Advanced query parser for MongoDB operations
 */
export class QueryParser {
  constructor(query, excludeFields = ['page', 'limit', 'sort', 'fields']) {
    this.query = { ...query };
    this.excludeFields = excludeFields;
    this.mongoQuery = {};
    this.sortOptions = {};
    this.selectFields = '';
    this.paginationOptions = {};
  }

  /**
   * Parse and build MongoDB filter query
   */
  filter() {
    // Remove excluded fields from query
    const filteredQuery = { ...this.query };
    this.excludeFields.forEach(field => delete filteredQuery[field]);

    // Convert query string to MongoDB query
    let queryStr = JSON.stringify(filteredQuery);
    
    // Replace operators (gte, gt, lte, lt, in, nin, ne)
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt|in|nin|ne|regex)\b/g, match => `$${match}`);
    
    this.mongoQuery = JSON.parse(queryStr);

    // Handle special query patterns
    this.handleSpecialQueries();

    return this;
  }

  /**
   * Handle special query patterns
   */
  handleSpecialQueries() {
    Object.keys(this.mongoQuery).forEach(key => {
      const value = this.mongoQuery[key];

      // Handle array queries (comma-separated values)
      if (typeof value === 'string' && value.includes(',')) {
        this.mongoQuery[key] = { $in: value.split(',') };
      }

      // Handle ObjectId fields
      if (key.toLowerCase().includes('id') && typeof value === 'string') {
        if (Types.ObjectId.isValid(value)) {
          this.mongoQuery[key] = new Types.ObjectId(value);
        }
      }

      // Handle boolean fields
      if (typeof value === 'string') {
        if (value.toLowerCase() === 'true') {
          this.mongoQuery[key] = true;
        } else if (value.toLowerCase() === 'false') {
          this.mongoQuery[key] = false;
        }
      }

      // Handle regex searches
      if (typeof value === 'object' && value.$regex) {
        this.mongoQuery[key] = {
          $regex: value.$regex,
          $options: value.$options || 'i', // Case insensitive by default
        };
      }
    });

    // Handle text search
    if (this.query.search) {
      this.mongoQuery.$text = { $search: this.query.search };
    }

    // Handle date range queries
    this.handleDateRanges();
  }

  /**
   * Handle date range queries
   */
  handleDateRanges() {
    Object.keys(this.mongoQuery).forEach(key => {
      const value = this.mongoQuery[key];

      if (typeof value === 'object' && value !== null) {
        Object.keys(value).forEach(operator => {
          if (['$gte', '$gt', '$lte', '$lt'].includes(operator)) {
            const dateValue = value[operator];
            if (typeof dateValue === 'string' && this.isValidDate(dateValue)) {
              value[operator] = new Date(dateValue);
            }
          }
        });
      }
    });
  }

  /**
   * Check if string is a valid date
   */
  isValidDate(dateString) {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date);
  }

  /**
   * Parse sorting options
   */
  sort() {
    if (this.query.sort) {
      const sortBy = this.query.sort.split(',').join(' ');
      
      // Handle sort direction (field:1 or field:-1)
      if (sortBy.includes(':')) {
        const sortPairs = sortBy.split(' ');
        const sortObj = {};
        
        sortPairs.forEach(pair => {
          const [field, direction] = pair.split(':');
          sortObj[field] = parseInt(direction) || 1;
        });
        
        this.sortOptions = sortObj;
      } else {
        this.sortOptions = sortBy;
      }
    } else {
      // Default sort by creation date (descending)
      this.sortOptions = { createdAt: -1 };
    }

    return this;
  }

  /**
   * Parse field selection
   */
  select() {
    if (this.query.fields) {
      this.selectFields = this.query.fields.split(',').join(' ');
    }

    return this;
  }

  /**
   * Parse pagination options
   */
  paginate() {
    const page = parseInt(this.query.page) || 1;
    const limit = parseInt(this.query.limit) || 10;
    const skip = (page - 1) * limit;

    this.paginationOptions = {
      page,
      limit: Math.min(limit, 100), // Max 100 items per page
      skip,
    };

    return this;
  }

  /**
   * Get parsed query options
   */
  getQueryOptions() {
    return {
      filter: this.mongoQuery,
      sort: this.sortOptions,
      select: this.selectFields,
      pagination: this.paginationOptions,
    };
  }

  /**
   * Execute query on a Mongoose model
   */
  async execute(Model) {
    const options = this.getQueryOptions();
    
    // Build the query
    let query = Model.find(options.filter);

    // Apply sorting
    if (options.sort) {
      query = query.sort(options.sort);
    }

    // Apply field selection
    if (options.select) {
      query = query.select(options.select);
    }

    // Apply pagination
    if (options.pagination) {
      query = query.skip(options.pagination.skip).limit(options.pagination.limit);
    }

    // Execute query and get total count
    const [data, total] = await Promise.all([
      query.exec(),
      Model.countDocuments(options.filter),
    ]);

    // Calculate pagination metadata
    const pagination = {
      page: options.pagination.page,
      limit: options.pagination.limit,
      total,
      pages: Math.ceil(total / options.pagination.limit),
      hasNext: options.pagination.page < Math.ceil(total / options.pagination.limit),
      hasPrev: options.pagination.page > 1,
    };

    return {
      data,
      pagination,
    };
  }
}

/**
 * Create query parser instance
 */
export const createQueryParser = (query, excludeFields) => {
  return new QueryParser(query, excludeFields);
};

/**
 * Advanced search builder
 */
export class SearchBuilder {
  constructor() {
    this.searchQuery = {};
  }

  /**
   * Add text search
   */
  text(searchTerm, fields = []) {
    if (!searchTerm) return this;

    if (fields.length > 0) {
      // Search in specific fields
      const searchConditions = fields.map(field => ({
        [field]: { $regex: searchTerm, $options: 'i' }
      }));
      
      this.searchQuery.$or = this.searchQuery.$or ? 
        [...this.searchQuery.$or, ...searchConditions] : 
        searchConditions;
    } else {
      // Full text search
      this.searchQuery.$text = { $search: searchTerm };
    }

    return this;
  }

  /**
   * Add range filter
   */
  range(field, min, max) {
    if (!field) return this;

    const rangeQuery = {};
    if (min !== undefined) rangeQuery.$gte = min;
    if (max !== undefined) rangeQuery.$lte = max;

    if (Object.keys(rangeQuery).length > 0) {
      this.searchQuery[field] = rangeQuery;
    }

    return this;
  }

  /**
   * Add date range filter
   */
  dateRange(field, startDate, endDate) {
    if (!field) return this;

    const rangeQuery = {};
    if (startDate) rangeQuery.$gte = new Date(startDate);
    if (endDate) rangeQuery.$lte = new Date(endDate);

    if (Object.keys(rangeQuery).length > 0) {
      this.searchQuery[field] = rangeQuery;
    }

    return this;
  }

  /**
   * Add in filter
   */
  in(field, values) {
    if (!field || !Array.isArray(values) || values.length === 0) return this;

    this.searchQuery[field] = { $in: values };
    return this;
  }

  /**
   * Add equals filter
   */
  equals(field, value) {
    if (!field || value === undefined) return this;

    this.searchQuery[field] = value;
    return this;
  }

  /**
   * Get built query
   */
  build() {
    return this.searchQuery;
  }
}
