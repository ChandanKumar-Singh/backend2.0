import Product from './product.model.js';
import { NotFoundError, ValidationError } from '../../core/error.js';
import { createQueryParser } from '../../utils/queryParser.js';
import { invalidateCacheByTags } from '../../middlewares/cache.js';
import logger from '../../core/logger.js';

export default class ProductService {
  /**
   * Get products with pagination and filtering
   */
  async getProducts(query) {
    try {
      const queryParser = createQueryParser(query);
      const result = await queryParser
        .filter()
        .sort()
        .select()
        .paginate()
        .execute(Product);

      logger.info('Products retrieved', {
        count: result.data.length,
        total: result.pagination.total,
      });

      return result;
    } catch (error) {
      logger.error('Failed to get products:', error);
      throw error;
    }
  }

  /**
   * Get product by ID
   */
  async getProductById(productId) {
    try {
      const product = await Product.findById(productId);
      
      if (!product) {
        throw new NotFoundError('Product not found');
      }

      logger.info('Product retrieved by ID', { productId });
      return product;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error('Failed to get product by ID:', error);
      throw error;
    }
  }

  /**
   * Create new product
   */
  async createProduct(productData, userId) {
    try {
      const product = new Product({
        ...productData,
        createdBy: userId,
      });

      await product.save();

      // Invalidate cache
      await invalidateCacheByTags(['products']);

      logger.info('Product created successfully', {
        productId: product._id,
        name: product.name,
        createdBy: userId,
      });

      return product;
    } catch (error) {
      logger.error('Failed to create product:', error);
      throw error;
    }
  }

  /**
   * Update product
   */
  async updateProduct(productId, updateData, userId) {
    try {
      const product = await Product.findById(productId);
      
      if (!product) {
        throw new NotFoundError('Product not found');
      }

      Object.assign(product, updateData);
      product.updatedBy = userId;
      
      await product.save();

      // Invalidate cache
      await invalidateCacheByTags(['products', `product:${productId}`]);

      logger.info('Product updated successfully', {
        productId,
        updatedFields: Object.keys(updateData),
        updatedBy: userId,
      });

      return product;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error('Failed to update product:', error);
      throw error;
    }
  }

  /**
   * Delete product
   */
  async deleteProduct(productId) {
    try {
      const product = await Product.findById(productId);
      
      if (!product) {
        throw new NotFoundError('Product not found');
      }

      await Product.findByIdAndDelete(productId);

      // Invalidate cache
      await invalidateCacheByTags(['products', `product:${productId}`]);

      logger.info('Product deleted successfully', { productId });
      return { message: 'Product deleted successfully' };
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error('Failed to delete product:', error);
      throw error;
    }
  }

  /**
   * Search products
   */
  async searchProducts(searchTerm, options = {}) {
    try {
      const { limit = 10, page = 1, category, minPrice, maxPrice } = options;
      const skip = (page - 1) * limit;

      const searchQuery = {
        $text: { $search: searchTerm },
        status: 'active',
      };

      if (category) {
        searchQuery.category = category;
      }

      if (minPrice !== undefined || maxPrice !== undefined) {
        searchQuery.price = {};
        if (minPrice !== undefined) searchQuery.price.$gte = Number(minPrice);
        if (maxPrice !== undefined) searchQuery.price.$lte = Number(maxPrice);
      }

      const [products, total] = await Promise.all([
        Product.find(searchQuery, { score: { $meta: 'textScore' } })
          .sort({ score: { $meta: 'textScore' } })
          .skip(skip)
          .limit(limit),
        Product.countDocuments(searchQuery)
      ]);

      const result = {
        data: products,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };

      logger.info('Product search completed', {
        searchTerm,
        resultsCount: products.length,
        total,
      });

      return result;
    } catch (error) {
      logger.error('Failed to search products:', error);
      throw error;
    }
  }

  /**
   * Get products by category
   */
  async getProductsByCategory(category, query) {
    try {
      const queryParser = createQueryParser({ ...query, category, status: 'active' });
      const result = await queryParser
        .filter()
        .sort()
        .select()
        .paginate()
        .execute(Product);

      logger.info('Products by category retrieved', {
        category,
        count: result.data.length,
        total: result.pagination.total,
      });

      return result;
    } catch (error) {
      logger.error('Failed to get products by category:', error);
      throw error;
    }
  }

  /**
   * Get featured products
   */
  async getFeaturedProducts(query) {
    try {
      const queryParser = createQueryParser({ ...query, featured: true, status: 'active' });
      const result = await queryParser
        .filter()
        .sort()
        .select()
        .paginate()
        .execute(Product);

      logger.info('Featured products retrieved', {
        count: result.data.length,
        total: result.pagination.total,
      });

      return result;
    } catch (error) {
      logger.error('Failed to get featured products:', error);
      throw error;
    }
  }

  /**
   * Get product statistics
   */
  async getProductStats() {
    try {
      const [
        totalProducts,
        activeProducts,
        inactiveProducts,
        lowStockProducts,
        outOfStockProducts,
        featuredProducts,
        categories
      ] = await Promise.all([
        Product.countDocuments(),
        Product.countDocuments({ status: 'active' }),
        Product.countDocuments({ status: 'inactive' }),
        Product.countDocuments({ stock: { $lte: 10 }, status: 'active' }),
        Product.countDocuments({ stock: 0, status: 'active' }),
        Product.countDocuments({ featured: true, status: 'active' }),
        Product.distinct('category')
      ]);

      const stats = {
        total: totalProducts,
        active: activeProducts,
        inactive: inactiveProducts,
        lowStock: lowStockProducts,
        outOfStock: outOfStockProducts,
        featured: featuredProducts,
        categories: categories.length,
        categoryList: categories,
      };

      logger.info('Product statistics retrieved', stats);
      return stats;
    } catch (error) {
      logger.error('Failed to get product statistics:', error);
      throw error;
    }
  }

  /**
   * Update product stock
   */
  async updateProductStock(productId, quantity) {
    try {
      const product = await Product.findById(productId);
      
      if (!product) {
        throw new NotFoundError('Product not found');
      }

      await product.updateStock(quantity);

      // Invalidate cache
      await invalidateCacheByTags(['products', `product:${productId}`]);

      logger.info('Product stock updated', {
        productId,
        quantity,
        newStock: product.stock,
      });

      return product;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error('Failed to update product stock:', error);
      throw error;
    }
  }
}
