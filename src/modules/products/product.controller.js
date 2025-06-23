import ProductService from './product.service.js';
import { sendSuccess, sendCreated, sendBadRequest } from '../../core/response.js';
import logger from '../../core/logger.js';

export default class ProductController {
  constructor() {
    this.productService = new ProductService();
  }

  /**
   * Get all products with pagination and filtering
   */
  async getProducts(req, res) {
    const result = await this.productService.getProducts(req.query);
    sendSuccess(res, 'Products retrieved successfully', result.data, {
      pagination: result.pagination,
    });
  }

  /**
   * Get product by ID
   */
  async getProductById(req, res) {
    const { id } = req.params;
    const product = await this.productService.getProductById(id);
    sendSuccess(res, 'Product retrieved successfully', product);
  }

  /**
   * Create new product
   */
  async createProduct(req, res) {
    const productData = req.body;
    const userId = req.user._id;
    const product = await this.productService.createProduct(productData, userId);
    sendCreated(res, 'Product created successfully', product);
  }

  /**
   * Update product
   */
  async updateProduct(req, res) {
    const { id } = req.params;
    const updateData = req.body;
    const userId = req.user._id;
    const product = await this.productService.updateProduct(id, updateData, userId);
    sendSuccess(res, 'Product updated successfully', product);
  }

  /**
   * Delete product
   */
  async deleteProduct(req, res) {
    const { id } = req.params;
    const result = await this.productService.deleteProduct(id);
    sendSuccess(res, result.message);
  }

  /**
   * Search products
   */
  async searchProducts(req, res) {
    const { q: searchTerm } = req.query;
    
    if (!searchTerm) {
      return sendBadRequest(res, 'Search term is required');
    }

    const result = await this.productService.searchProducts(searchTerm, req.query);
    sendSuccess(res, 'Product search completed', result.data, {
      pagination: result.pagination,
    });
  }

  /**
   * Get products by category
   */
  async getProductsByCategory(req, res) {
    const { category } = req.params;
    const result = await this.productService.getProductsByCategory(category, req.query);
    sendSuccess(res, 'Products retrieved successfully', result.data, {
      pagination: result.pagination,
    });
  }

  /**
   * Get featured products
   */
  async getFeaturedProducts(req, res) {
    const result = await this.productService.getFeaturedProducts(req.query);
    sendSuccess(res, 'Featured products retrieved successfully', result.data, {
      pagination: result.pagination,
    });
  }

  /**
   * Get product statistics
   */
  async getProductStats(req, res) {
    const stats = await this.productService.getProductStats();
    sendSuccess(res, 'Product statistics retrieved successfully', stats);
  }
}
