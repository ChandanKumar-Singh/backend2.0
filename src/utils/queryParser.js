import mongoose, { Types } from 'mongoose';
import { config } from '../config/env.js';

/**
### 🚀 QueryParser Utility for MongoDB(Mongoose)

  #### Supports:

  - ✅ Filtering:
`?status=active&price[gte]=100`
  - ✅ Sorting:
`?sort=createdAt:-1,name:1`
  - ✅ Field Selection:
`?fields=name,price`
  - ✅ Pagination:
`?page=2&limit=20`
  - ✅ Text Search:
`?search=keyword`
  - ✅ Date Range Filters:
`?createdAt[gte]=2023-01-01`
  - ✅ Population of related documents

---

### 📦 Example Usage

  ```js
const queryParser = createQueryParser(
  req.query, // Incoming request query
  undefined, // Fields to exclude from filter (optional)
  [
    { path: 'userId', select: 'username email' },
    { path: 'createdBy', select: 'fullName role' },
  ] // Population configuration (optional)
);

const result = await queryParser
  .filter()     // Filters based on query params
  .sort()       // Handles sorting
  .select()     // Handles field selection
  .paginate()   // Applies pagination
  .execute(Notification); // Executes on Mongoose Model
```

---

### 📘 Sample Response

  ```json
{
  "data": [ paginated documents  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 125,
    "pages": 13,
    "hasNext": true,
    "hasPrev": false
  }
}
```

---
 */

export class QueryParser {
  constructor(query, excludeFields = ['page', 'limit', 'sort', 'fields']) {
    this.query = { ...query };
    this.excludeFields = excludeFields;
    this.mongoQuery = {};
    this.sortOptions = {};
    this.selectFields = '';
    this.paginationOptions = {};
    this.populateFields = [];
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

    // Populate with optional select
    if (this.populateFields.length > 0) {
      this.populateFields.forEach((field) => {
        if (typeof field === 'string') {
          query = query.populate(field);
        } else if (typeof field === 'object' && field.path) {
          query = query.populate({
            path: field.path,
            select: field.select || '',
          });
        }
      });
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

/**
 * QueryConfig
 * ----------------
 * A utility class to build MongoDB query configurations for Mongoose models.
 * Supports complex filtering, sorting, pagination, and regex-based text search.
 * 

 */

export class QueryConfig {


  /**
   * Build query config for MongoDB pipeline usage.
   *
   * @param {Object} options
   * @param {String} options.q - Global search keyword for regex fields.
   * @param {Array} options.query_data - Array of filters:
   *        {
   *          name: string,          // Field name to filter
   *          value: any,            // Value to match
   *          type: string,          // one of ['select', 'number', 'date', 'array', 'exists', 'range']
   *          operator?: string      // Optional operator like 'eq', 'gte', 'lte', etc.
   *        }
   * @param {Number} options.page - Current page for pagination (default: 1)
   * @param {Number} options.limit - Number of records per page (default: 5, max: 100)
   * @param {String} options.sortBy - Field to sort by (default: 'createdAt')
   * @param {String} options.sortOrder - Sort direction ('asc' | 'desc')
   * @param {Array<String>} options.regexFields - Fields to apply global search regex on
   * @param {Array<String>} options.allowedFields - Whitelisted filterable field names
   * @param {String} options.timezone - Timezone string (optional)
   *
   * @returns {{
   *   filters: Array<Object>,     // Array of $match stages
   *   sort: Object,               // Sorting config
   *   page: Number,               // Page number
   *   limit: Number,              // Limit per page
   *   timezone: String            // Passed timezone
   * }}
   */
  static build({
    q = '',
    query_data = [],
    page = 1,
    limit = 5,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    regexFields = [],
    allowedFields = [],
    timezone = config.TIME_ZONE_NAME,
  } = {}) {
    const filters = [];
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };
    page = parseInt(page, 10) || 1;
    limit = Math.min(parseInt(limit, 10) || 20, 100);

    const allowed = new Set(allowedFields);

    // Global Text Search
    if (q && q.length > 0 && regexFields.length > 0) {
      const regex = regexFields.map(f => ({
        [f]: { $regex: q, $options: 'i' },
      }));
      filters.push({ $or: regex });
    }

    // Process query_data for specific filters
    for (const item of query_data) {
      const { name, value, type, operator } = item;
      if (!name || value === undefined || value === null || value === '') continue;

      if (allowed.size > 0 && !allowed.has(name)) continue;

      const safeValue = typeof value === 'string' ? value.replace(/\$/g, '') : value;

      switch (type) {
        case 'select':
          filters.push({
            [name]: Array.isArray(value)
              ? { $in: value.map(this.toObjectId) }
              : this.toObjectId(value),
          });
          break;

        case 'number':
          filters.push({ [name]: { [`$${operator || 'eq'}`]: parseFloat(value) } });
          break;

        case 'date':
          const date = new Date(value);
          filters.push({ [name]: { [`$${operator || 'eq'}`]: date } });
          break;

        case 'array':
          filters.push({
            [name]: {
              [operator === 'nin' ? '$nin' : '$in']: Array.isArray(value)
                ? value
                : [value],
            },
          });
          break;

        case 'exists':
          filters.push({ [name]: { $exists: !!value } });
          break;

        case 'range':
          if (Array.isArray(value) && value.length === 2) {
            filters.push({ [name]: { $gte: value[0], $lte: value[1] } });
          }
          break;

        default:
          break;
      }
    }

    const stage = {
      filters: filters.length ? [{ $match: { $and: filters } }] : [],
      page,
      limit,
      sort,
      timezone,
    };
    // console.log(JSON.stringify(stage, null, 2));
    return stage;
  }

  static toObjectId(value) {
    return mongoose.Types.ObjectId.isValid(value)
      ? mongoose.Types.ObjectId(value)
      : String(value);
  }
}


/**
 * UniversalQueryBuilder
 * ---------------------
 * A flexible, dynamic MongoDB aggregation pipeline builder for Mongoose models.
 * Supports chaining common aggregation stages like match, lookup, unwind, addFields,
 * project, sort, pagination, and allows injecting any custom aggregation stage.
 * 
  #### Usage Example:
  ```js
    const builder = new UniversalQueryBuilder(UserModel)
      .setSession(session)
      .match({ status: 'active' })
      .lookup({ from: 'orders', localField: '_id', foreignField: 'userId', as: 'orders' })
      .unwind({ path: '$orders', preserveNullAndEmptyArrays: true })
      .addFields({ fullName: { $concat: ['$firstName', ' ', '$lastName'] } })
      .sortBy({ createdAt: -1 })
      .paginate(2, 10);
    
    const results = await builder.aggregate();
  ```

### 🚀 Example Usage

  ```js
const builder = new UniversalQueryBuilder(UserModel);

const result = await builder
  .setSession(session)  // Optional session
  .match({ status: 'active' })
  .lookup({
    from: 'companies',
    localField: 'companyId',
    foreignField: '_id',
    as: 'companyInfo',
  })
  .unwind({ path: '$companyInfo', preserveNullAndEmptyArrays: true })
  .addFields({
    fullName: {
      $concat: ['$firstName', ' ', '$lastName'],
    },
    isActive: { $eq: ['$status', 'active'] },
  })
  .sortBy({ createdAt: -1 })
  .paginate(1, 10)
  .project({
    fullName: 1,
    email: 1,
    isActive: 1,
    company: '$companyInfo.name',
  })
  .aggregate();

console.log(result);
```

---

### 🎯 When to Use

 - Instead of cluttering code with large, hard - to - maintain pipelines.
 - When building aggregation pipelines dynamically based on filters.
 - For shared logic across multiple models and services.
 - When your app requires flexible filtering, lookup, pagination, and projection patterns.
 */
export class UniversalQueryBuilder {
  /**
   * Creates a new query builder for the given Mongoose model.
   * @param {mongoose.Model} model - The Mongoose model to query.
   */
  constructor(model) {
    this.model = model;
    this.pipeline = [];
    this.session = null;
  }

  /**
   * Sets the MongoDB session to use for the query (for transactions).
   * @param {ClientSession} session - Mongoose client session object.
   * @returns {UniversalQueryBuilder} this - For chaining.
   */
  setSession(session) {
    this.session = session;
    return this;
  }

  /**
   * Adds a $match stage to filter documents.
   * @param {Object} filter - MongoDB query filter object.
   * @returns {UniversalQueryBuilder} this - For chaining.
   */
  match(filters) {
    if (filters && filters.length > 0) {
      this.pipeline.push(...filters);
    }
    return this;
  }

  /**
   * Adds a $lookup stage for joining related collections.
   * @param {Object} lookupConfig - The $lookup stage configuration.
   * @returns {UniversalQueryBuilder} this - For chaining.
   */
  lookup(lookupConfig) {
    this.pipeline.push({ $lookup: lookupConfig });
    return this;
  }

  /**
   * Adds an $unwind stage to deconstruct array fields.
   * @param {Object|string} unwindConfig - The $unwind stage config or path string.
   * @returns {UniversalQueryBuilder} this - For chaining.
   */
  unwind(unwindConfig) {
    this.pipeline.push({ $unwind: unwindConfig });
    return this;
  }

  /**
   * Adds an $addFields stage to add or compute new fields.
   * @param {Object} fields - Object defining new fields and expressions.
   * @returns {UniversalQueryBuilder} this - For chaining.
   */
  addFields(fields) {
    if (fields && Object.keys(fields).length) {
      this.pipeline.push({ $addFields: fields });
    }
    return this;
  }

  /**
   * Adds a $project stage to include/exclude fields from output.
   * @param {Object} fields - Projection specification.
   * @returns {UniversalQueryBuilder} this - For chaining.
   */
  project(fields) {
    if (fields && Object.keys(fields).length) {
      this.pipeline.push({ $project: fields });
    }
    return this;
  }

  /**
   * Adds a $sort stage to sort the results.
   * @param {Object} sort - Sorting specification, e.g., { createdAt: -1 }.
   * @returns {UniversalQueryBuilder} this - For chaining.
   */
  sortBy(sort) {
    if (sort && Object.keys(sort).length) {
      this.pipeline.push({ $sort: sort });
    }
    return this;
  }

  /**
   * Adds $skip and $limit stages for pagination.
   * @param {number} page - Page number (1-based).
   * @param {number} limit - Number of documents per page.
   * @returns {UniversalQueryBuilder} this - For chaining.
   */
  paginate(page, limit) {
    const skip = (page - 1) * limit;
    this.pipeline.push({ $skip: skip }, { $limit: limit });
    return this;
  }

  /**
   * Adds an arbitrary aggregation stage.
   * Use this method to inject any valid MongoDB aggregation stage.
   * @param {Object} stage - Aggregation pipeline stage object.
   * @returns {UniversalQueryBuilder} this - For chaining.
   */
  addStage(stage) {
    this.pipeline.push(stage);
    return this;
  }

  /**
   * Executes the built aggregation pipeline on the model.
   * @returns {Promise<Array>} Aggregation results.
   */
  async aggregate() {
    let agg = this.model.aggregate(this.pipeline);
    if (this.session) agg = agg.session(this.session);
    return agg.exec();
  }

  /**
   * Counts documents matching the filter.
   * @param {Object} filter - MongoDB query filter.
   * @returns {Promise<number>} Count of matching documents.
   */
  async countDocuments(filter) {
    return this.model.countDocuments(filter).session(this.session);
  }

  async exec(paginate = true) {
    const data = await this.aggregate();
    if (paginate) {
      const page = this.pipeline.find(p => p.$skip)?.$skip / this.pipeline.find(p => p.$limit)?.$limit + 1 || 1;
      const limit = this.pipeline.find(p => p.$limit)?.$limit || 20;

      const matchStage = this.pipeline.find(p => p.$match);
      const total = await this.countDocuments(matchStage?.$match || {});

      return {
        data,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1,
        },
      };
    } else {
      return { data, pagination: null };
    }
  }

}

export class UniversalPipelineBuilder {
  constructor(model) {
    this.model = model;
    this.pipeline = [];
    this.session = null;
    this.page = 1;
    this.limit = 20;
    this.sort = { createdAt: -1 };
  }

  setMatchStages(matchStages = []) {
    this.pipeline.push(...matchStages);
    return this;
  }

  setSession(session) {
    this.session = session;
    return this;
  }

  setPagination({ page, limit }) {
    this.page = parseInt(page || 1);
    this.limit = Math.min(parseInt(limit || 20), 100);
    return this;
  }

  setSort(sort) {
    if (sort && Object.keys(sort).length) {
      this.sort = sort;
    }
    return this;
  }

  addLookups(lookups = []) {
    lookups.forEach(({ from, localField, foreignField, as, unwind = false }) => {
      this.pipeline.push({ $lookup: { from, localField, foreignField, as } });
      if (unwind) {
        this.pipeline.push({
          $unwind: { path: `$${as}`, preserveNullAndEmptyArrays: true },
        });
      }
    });
    return this;
  }

  addFields(fields) {
    if (fields && Object.keys(fields).length) {
      this.pipeline.push({ $addFields: fields });
    }
    return this;
  }

  addProject(fields) {
    if (fields && Object.keys(fields).length) {
      this.pipeline.push({ $project: fields });
    }
    return this;
  }

  addStages(stages = []) {
    this.pipeline.push(...stages);
    return this;
  }

  async exec(paginate = true) {
    this.pipeline.push({ $sort: this.sort });

    if (paginate) {
      const skip = (this.page - 1) * this.limit;
      this.pipeline.push({ $skip: skip }, { $limit: this.limit });
    }

    let agg = this.model.aggregate(this.pipeline);
    if (this.session) agg = agg.session(this.session);

    const data = await agg.exec();

    const matchStage = this.pipeline.find(p => p.$match);
    const total = await this.model.countDocuments(matchStage?.$match || {}).session(this.session);

    return paginate
      ? {
        data,
        pagination: {
          page: this.page,
          limit: this.limit,
          total,
          pages: Math.ceil(total / this.limit),
          hasNext: this.page * this.limit < total,
          hasPrev: this.page > 1,
        },
      }
      : data;
  }
}
