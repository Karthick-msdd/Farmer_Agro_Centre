import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middlewares/auth';

export const getProducts = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      category, 
      minPrice, 
      maxPrice, 
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    
    const where: any = {
      isActive: true
    };

    if (category) {
      where.categoryId = String(category);
    }

    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price.gte = Number(minPrice);
      if (maxPrice) where.price.lte = Number(maxPrice);
    }

    if (search) {
      where.OR = [
        { title: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          category: true,
          supplier: {
            include: {
              user: {
                select: {
                  name: true,
                  email: true,
                  phone: true
                }
              }
            }
          },
          agroCenter: {
            include: {
              user: {
                select: {
                  name: true,
                  email: true,
                  phone: true
                }
              }
            }
          },
          inventory: {
            select: {
              quantity: true,
              batchNo: true,
              expiryDate: true
            }
          }
        },
        orderBy: {
          [sortBy as string]: sortOrder
        },
        skip,
        take: Number(limit)
      }),
      prisma.product.count({ where })
    ]);

    return res.json({
      products,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Get products error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const getProductById = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { id } = req.params;

    const product = await prisma.product.findUnique({
      where: { id: String(id) },
      include: {
        category: true,
        supplier: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
                phone: true
              }
            }
          }
        },
        agroCenter: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
                phone: true
              }
            }
          }
        },
        inventory: {
          select: {
            quantity: true,
            batchNo: true,
            expiryDate: true,
            location: true
          }
        }
      }
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    return res.json({ product });
  } catch (error) {
    console.error('Get product by ID error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const createProduct = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const {
      title,
      description,
      categoryId,
      price,
      unit,
      sku,
      images = []
    } = req.body;

    if (!title || !categoryId || !price || !unit) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const userId = req.user!.id;
    const userRole = req.user!.role;

    let supplierId = null;
    let agroCenterId = null;

    if (userRole === 'SUPPLIER') {
      const supplier = await prisma.supplier.findUnique({
        where: { userId }
      });
      supplierId = supplier?.id;
    } else if (userRole === 'AGROCENTER') {
      const agroCenter = await prisma.agroCenter.findUnique({
        where: { userId }
      });
      agroCenterId = agroCenter?.id;
    }

    const product = await prisma.product.create({
      data: {
        title,
        description,
        categoryId: String(categoryId),
        price: Number(price),
        unit,
        sku,
        images,
        supplierId,
        agroCenterId
      },
      include: {
        category: true,
        supplier: true,
        agroCenter: true
      }
    });

    return res.status(201).json({
      message: 'Product created successfully',
      product
    });
  } catch (error) {
    console.error('Create product error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateProduct = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      categoryId,
      price,
      unit,
      sku,
      images,
      isActive
    } = req.body;

    const userId = req.user!.id;
    const userRole = req.user!.role;

    // Check if user owns this product
    const existingProduct = await prisma.product.findUnique({
      where: { id: String(id) }
    });

    if (!existingProduct) {
      return res.status(404).json({ error: 'Product not found' });
    }

    if (userRole === 'SUPPLIER' && existingProduct.supplierId) {
      const supplier = await prisma.supplier.findUnique({
        where: { userId }
      });
      if (supplier?.id !== existingProduct.supplierId) {
        return res.status(403).json({ error: 'Not authorized to update this product' });
      }
    } else if (userRole === 'AGROCENTER' && existingProduct.agroCenterId) {
      const agroCenter = await prisma.agroCenter.findUnique({
        where: { userId }
      });
      if (agroCenter?.id !== existingProduct.agroCenterId) {
        return res.status(403).json({ error: 'Not authorized to update this product' });
      }
    }

    const updatedProduct = await prisma.product.update({
      where: { id: String(id) },
      data: {
        ...(title && { title }),
        ...(description && { description }),
        ...(categoryId && { categoryId: String(categoryId) }),
        ...(price && { price: Number(price) }),
        ...(unit && { unit }),
        ...(sku && { sku }),
        ...(images && { images }),
        ...(isActive !== undefined && { isActive })
      },
      include: {
        category: true,
        supplier: true,
        agroCenter: true
      }
    });

    return res.json({
      message: 'Product updated successfully',
      product: updatedProduct
    });
  } catch (error) {
    console.error('Update product error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteProduct = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    const product = await prisma.product.findUnique({
      where: { id: String(id) }
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Check authorization
    if (userRole === 'SUPPLIER' && product.supplierId) {
      const supplier = await prisma.supplier.findUnique({
        where: { userId }
      });
      if (supplier?.id !== product.supplierId) {
        return res.status(403).json({ error: 'Not authorized to delete this product' });
      }
    } else if (userRole === 'AGROCENTER' && product.agroCenterId) {
      const agroCenter = await prisma.agroCenter.findUnique({
        where: { userId }
      });
      if (agroCenter?.id !== product.agroCenterId) {
        return res.status(403).json({ error: 'Not authorized to delete this product' });
      }
    }

    // Soft delete by setting isActive to false
    await prisma.product.update({
      where: { id: String(id) },
      data: { isActive: false }
    });

    return res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Delete product error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const getProductsByCategory = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { categoryId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where: {
          categoryId: String(categoryId),
          isActive: true
        },
        include: {
          category: true,
          supplier: true,
          agroCenter: true,
          inventory: {
            select: {
              quantity: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take: Number(limit)
      }),
      prisma.product.count({
        where: {
          categoryId: String(categoryId),
          isActive: true
        }
      })
    ]);

    return res.json({
      products,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Get products by category error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const searchProducts = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { q, page = 1, limit = 20 } = req.query;

    if (!q) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where: {
          isActive: true,
          OR: [
            { title: { contains: q as string, mode: 'insensitive' } },
            { description: { contains: q as string, mode: 'insensitive' } },
            { sku: { contains: q as string, mode: 'insensitive' } }
          ]
        },
        include: {
          category: true,
          supplier: true,
          agroCenter: true,
          inventory: {
            select: {
              quantity: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take: Number(limit)
      }),
      prisma.product.count({
        where: {
          isActive: true,
          OR: [
            { title: { contains: q as string, mode: 'insensitive' } },
            { description: { contains: q as string, mode: 'insensitive' } },
            { sku: { contains: q as string, mode: 'insensitive' } }
          ]
        }
      })
    ]);

    return res.json({
      products,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Search products error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
