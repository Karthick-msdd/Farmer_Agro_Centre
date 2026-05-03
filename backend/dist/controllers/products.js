"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchProducts = exports.getProductsByCategory = exports.deleteProduct = exports.updateProduct = exports.createProduct = exports.getProductById = exports.getProducts = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const getProducts = async (req, res) => {
    try {
        const { page = 1, limit = 20, category, minPrice, maxPrice, search, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
        const skip = (Number(page) - 1) * Number(limit);
        const where = {
            isActive: true
        };
        if (category) {
            where.categoryId = String(category);
        }
        if (minPrice || maxPrice) {
            where.price = {};
            if (minPrice)
                where.price.gte = Number(minPrice);
            if (maxPrice)
                where.price.lte = Number(maxPrice);
        }
        if (search) {
            where.OR = [
                { title: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } }
            ];
        }
        const [products, total] = await Promise.all([
            prisma_1.default.product.findMany({
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
                    [sortBy]: sortOrder
                },
                skip,
                take: Number(limit)
            }),
            prisma_1.default.product.count({ where })
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
    }
    catch (error) {
        console.error('Get products error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getProducts = getProducts;
const getProductById = async (req, res) => {
    try {
        const { id } = req.params;
        const product = await prisma_1.default.product.findUnique({
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
    }
    catch (error) {
        console.error('Get product by ID error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getProductById = getProductById;
const createProduct = async (req, res) => {
    try {
        const { title, description, categoryId, price, unit, sku, images = [] } = req.body;
        if (!title || !categoryId || !price || !unit) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        const userId = req.user.id;
        const userRole = req.user.role;
        let supplierId = null;
        let agroCenterId = null;
        if (userRole === 'SUPPLIER') {
            const supplier = await prisma_1.default.supplier.findUnique({
                where: { userId }
            });
            supplierId = supplier?.id;
        }
        else if (userRole === 'AGROCENTER') {
            const agroCenter = await prisma_1.default.agroCenter.findUnique({
                where: { userId }
            });
            agroCenterId = agroCenter?.id;
        }
        const product = await prisma_1.default.product.create({
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
    }
    catch (error) {
        console.error('Create product error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
exports.createProduct = createProduct;
const updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, categoryId, price, unit, sku, images, isActive } = req.body;
        const userId = req.user.id;
        const userRole = req.user.role;
        const existingProduct = await prisma_1.default.product.findUnique({
            where: { id: String(id) }
        });
        if (!existingProduct) {
            return res.status(404).json({ error: 'Product not found' });
        }
        if (userRole === 'SUPPLIER' && existingProduct.supplierId) {
            const supplier = await prisma_1.default.supplier.findUnique({
                where: { userId }
            });
            if (supplier?.id !== existingProduct.supplierId) {
                return res.status(403).json({ error: 'Not authorized to update this product' });
            }
        }
        else if (userRole === 'AGROCENTER' && existingProduct.agroCenterId) {
            const agroCenter = await prisma_1.default.agroCenter.findUnique({
                where: { userId }
            });
            if (agroCenter?.id !== existingProduct.agroCenterId) {
                return res.status(403).json({ error: 'Not authorized to update this product' });
            }
        }
        const updatedProduct = await prisma_1.default.product.update({
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
    }
    catch (error) {
        console.error('Update product error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
exports.updateProduct = updateProduct;
const deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const userRole = req.user.role;
        const product = await prisma_1.default.product.findUnique({
            where: { id: String(id) }
        });
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }
        if (userRole === 'SUPPLIER' && product.supplierId) {
            const supplier = await prisma_1.default.supplier.findUnique({
                where: { userId }
            });
            if (supplier?.id !== product.supplierId) {
                return res.status(403).json({ error: 'Not authorized to delete this product' });
            }
        }
        else if (userRole === 'AGROCENTER' && product.agroCenterId) {
            const agroCenter = await prisma_1.default.agroCenter.findUnique({
                where: { userId }
            });
            if (agroCenter?.id !== product.agroCenterId) {
                return res.status(403).json({ error: 'Not authorized to delete this product' });
            }
        }
        await prisma_1.default.product.update({
            where: { id: String(id) },
            data: { isActive: false }
        });
        return res.json({ message: 'Product deleted successfully' });
    }
    catch (error) {
        console.error('Delete product error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
exports.deleteProduct = deleteProduct;
const getProductsByCategory = async (req, res) => {
    try {
        const { categoryId } = req.params;
        const { page = 1, limit = 20 } = req.query;
        const skip = (Number(page) - 1) * Number(limit);
        const [products, total] = await Promise.all([
            prisma_1.default.product.findMany({
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
            prisma_1.default.product.count({
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
    }
    catch (error) {
        console.error('Get products by category error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getProductsByCategory = getProductsByCategory;
const searchProducts = async (req, res) => {
    try {
        const { q, page = 1, limit = 20 } = req.query;
        if (!q) {
            return res.status(400).json({ error: 'Search query is required' });
        }
        const skip = (Number(page) - 1) * Number(limit);
        const [products, total] = await Promise.all([
            prisma_1.default.product.findMany({
                where: {
                    isActive: true,
                    OR: [
                        { title: { contains: q, mode: 'insensitive' } },
                        { description: { contains: q, mode: 'insensitive' } },
                        { sku: { contains: q, mode: 'insensitive' } }
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
            prisma_1.default.product.count({
                where: {
                    isActive: true,
                    OR: [
                        { title: { contains: q, mode: 'insensitive' } },
                        { description: { contains: q, mode: 'insensitive' } },
                        { sku: { contains: q, mode: 'insensitive' } }
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
    }
    catch (error) {
        console.error('Search products error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
exports.searchProducts = searchProducts;
//# sourceMappingURL=products.js.map