import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middlewares/auth';

export const getCart = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const userId = req.user!.id;

    const cartItems = await prisma.cartItem.findMany({
      where: { userId },
      include: {
        product: {
          include: {
            category: true,
            inventory: {
              select: {
                quantity: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const totalAmount = cartItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);

    return res.json({
      items: cartItems,
      totalAmount,
      itemCount: cartItems.length
    });
  } catch (error) {
    console.error('Get cart error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const addToCart = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const userId = req.user!.id;
    const { productId, quantity = 1 } = req.body;

    if (!productId) {
      return res.status(400).json({ error: 'Product ID is required' });
    }

    // Check if product exists and is active
    const product = await prisma.product.findFirst({
      where: { id: String(productId), isActive: true }
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Check inventory availability
    const invAgg = await prisma.inventoryItem.aggregate({
      _sum: { quantity: true },
      where: { productId: String(productId) }
    });
    const totalInventory = invAgg._sum.quantity ?? 0;
    if (totalInventory < quantity) {
      return res.status(400).json({ error: 'Insufficient inventory' });
    }

    // Check if item already exists in cart
    const existingItem = await prisma.cartItem.findUnique({
      where: {
        userId_productId: {
          userId,
          productId: String(productId)
        }
      }
    });

    if (existingItem) {
      // Update quantity
      const updatedItem = await prisma.cartItem.update({
        where: {
          userId_productId: {
            userId,
            productId: String(productId)
          }
        },
        data: {
          quantity: existingItem.quantity + quantity
        },
        include: {
          product: {
            include: {
              category: true
            }
          }
        }
      });

      return res.json({
        message: 'Item quantity updated in cart',
        item: updatedItem
      });
    } else {
      // Add new item
      const newItem = await prisma.cartItem.create({
        data: {
          userId,
          productId: String(productId),
          quantity
        },
        include: {
          product: {
            include: {
              category: true
            }
          }
        }
      });

      return res.status(201).json({
        message: 'Item added to cart',
        item: newItem
      });
    }
  } catch (error) {
    console.error('Add to cart error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateCartItem = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const userId = req.user!.id;
    const { productId } = req.params;
    const { quantity } = req.body;

    if (!quantity || quantity < 1) {
      return res.status(400).json({ error: 'Valid quantity is required' });
    }

    const existingItem = await prisma.cartItem.findUnique({
      where: {
        userId_productId: {
          userId,
          productId: String(productId)
        }
      },
      include: {
        product: {
          include: {
            inventory: {
              select: {
                quantity: true
              }
            }
          }
        }
      }
    });

    if (!existingItem) {
      return res.status(404).json({ error: 'Item not found in cart' });
    }

    // Check inventory availability
    const invAgg = await prisma.inventoryItem.aggregate({
      _sum: { quantity: true },
      where: { productId: String(productId) }
    });
    const totalInventory = invAgg._sum.quantity ?? 0;
    if (totalInventory < quantity) {
      return res.status(400).json({ error: 'Insufficient inventory' });
    }

    const updatedItem = await prisma.cartItem.update({
      where: {
        userId_productId: {
          userId,
          productId: String(productId)
        }
      },
      data: { quantity },
      include: {
        product: {
          include: {
            category: true
          }
        }
      }
    });

    return res.json({
      message: 'Cart item updated',
      item: updatedItem
    });
  } catch (error) {
    console.error('Update cart item error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const removeFromCart = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const userId = req.user!.id;
    const { productId } = req.params;

    const deletedItem = await prisma.cartItem.delete({
      where: {
        userId_productId: {
          userId,
          productId: String(productId)
        }
      }
    });

    return res.json({
      message: 'Item removed from cart',
      item: deletedItem
    });
  } catch (error) {
    console.error('Remove from cart error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const clearCart = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const userId = req.user!.id;

    await prisma.cartItem.deleteMany({
      where: { userId }
    });

    return res.json({
      message: 'Cart cleared successfully'
    });
  } catch (error) {
    console.error('Clear cart error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
