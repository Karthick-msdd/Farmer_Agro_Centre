"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearCart = exports.removeFromCart = exports.updateCartItem = exports.addToCart = exports.getCart = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const getCart = async (req, res) => {
    try {
        const userId = req.user.id;
        const cartItems = await prisma_1.default.cartItem.findMany({
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
    }
    catch (error) {
        console.error('Get cart error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getCart = getCart;
const addToCart = async (req, res) => {
    try {
        const userId = req.user.id;
        const { productId, quantity = 1 } = req.body;
        if (!productId) {
            return res.status(400).json({ error: 'Product ID is required' });
        }
        const product = await prisma_1.default.product.findFirst({
            where: { id: String(productId), isActive: true }
        });
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }
        const invAgg = await prisma_1.default.inventoryItem.aggregate({
            _sum: { quantity: true },
            where: { productId: String(productId) }
        });
        const totalInventory = invAgg._sum.quantity ?? 0;
        if (totalInventory < quantity) {
            return res.status(400).json({ error: 'Insufficient inventory' });
        }
        const existingItem = await prisma_1.default.cartItem.findUnique({
            where: {
                userId_productId: {
                    userId,
                    productId: String(productId)
                }
            }
        });
        if (existingItem) {
            const updatedItem = await prisma_1.default.cartItem.update({
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
        }
        else {
            const newItem = await prisma_1.default.cartItem.create({
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
    }
    catch (error) {
        console.error('Add to cart error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
exports.addToCart = addToCart;
const updateCartItem = async (req, res) => {
    try {
        const userId = req.user.id;
        const { productId } = req.params;
        const { quantity } = req.body;
        if (!quantity || quantity < 1) {
            return res.status(400).json({ error: 'Valid quantity is required' });
        }
        const existingItem = await prisma_1.default.cartItem.findUnique({
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
        const invAgg = await prisma_1.default.inventoryItem.aggregate({
            _sum: { quantity: true },
            where: { productId: String(productId) }
        });
        const totalInventory = invAgg._sum.quantity ?? 0;
        if (totalInventory < quantity) {
            return res.status(400).json({ error: 'Insufficient inventory' });
        }
        const updatedItem = await prisma_1.default.cartItem.update({
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
    }
    catch (error) {
        console.error('Update cart item error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
exports.updateCartItem = updateCartItem;
const removeFromCart = async (req, res) => {
    try {
        const userId = req.user.id;
        const { productId } = req.params;
        const deletedItem = await prisma_1.default.cartItem.delete({
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
    }
    catch (error) {
        console.error('Remove from cart error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
exports.removeFromCart = removeFromCart;
const clearCart = async (req, res) => {
    try {
        const userId = req.user.id;
        await prisma_1.default.cartItem.deleteMany({
            where: { userId }
        });
        return res.json({
            message: 'Cart cleared successfully'
        });
    }
    catch (error) {
        console.error('Clear cart error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
exports.clearCart = clearCart;
//# sourceMappingURL=cart.js.map