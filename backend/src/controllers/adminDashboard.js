// Admin Dashboard Controller
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();

// Get dashboard statistics
const getDashboardStats = async (req, res) => {
  try {
    const stats = await prisma.$transaction([
      prisma.user.count(),
      prisma.order.count(),
      prisma.product.count(),
      prisma.order.aggregate({
        _sum: {
          totalAmount: true
        }
      })
    ]);

    const [totalUsers, totalOrders, totalProducts, revenueData] = stats;

    res.json({
      success: true,
      data: {
        stats: {
          totalUsers,
          totalOrders,
          totalProducts,
          totalRevenue: revenueData._sum.totalAmount || 0
        }
      }
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get farmer queries
const getFarmerQueries = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, assignedTo } = req.query;
    const skip = (page - 1) * limit;

    const where = {};
    if (status) where.status = status;
    if (assignedTo) where.assignedTo = assignedTo;

    const queries = await prisma.farmerQuery.findMany({
      where,
      skip: parseInt(skip),
      take: parseInt(limit),
      include: {
        farmer: {
          select: {
            id: true,
            name: true,
            phone: true,
            village: true,
            district: true
          }
        },
        assignedExpert: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const total = await prisma.farmerQuery.count({ where });

    res.json({
      success: true,
      data: {
        queries,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get farmer queries error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Assign query to expert
const assignQueryToExpert = async (req, res) => {
  try {
    const { queryId } = req.params;
    const { expertId } = req.body;

    const query = await prisma.farmerQuery.update({
      where: { id: queryId },
      data: {
        assignedTo: expertId,
        status: 'ASSIGNED',
        assignedAt: new Date()
      },
      include: {
        farmer: true,
        assignedExpert: true
      }
    });

    res.json({
      success: true,
      data: { query },
      message: 'Query assigned successfully'
    });
  } catch (error) {
    console.error('Assign query error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Reply to farmer query
const replyToQuery = async (req, res) => {
  try {
    const { queryId } = req.params;
    const { reply, replyType = 'TEXT', attachments } = req.body;

    const query = await prisma.farmerQuery.update({
      where: { id: queryId },
      data: {
        reply,
        replyType,
        attachments: attachments || [],
        status: 'REPLIED',
        repliedAt: new Date()
      }
    });

    // TODO: Send notification to farmer

    res.json({
      success: true,
      data: { query },
      message: 'Reply sent successfully'
    });
  } catch (error) {
    console.error('Reply to query error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Mark query as resolved
const markQueryResolved = async (req, res) => {
  try {
    const { queryId } = req.params;

    const query = await prisma.farmerQuery.update({
      where: { id: queryId },
      data: {
        status: 'RESOLVED',
        resolvedAt: new Date()
      }
    });

    // TODO: Send notification to farmer

    res.json({
      success: true,
      data: { query },
      message: 'Query marked as resolved'
    });
  } catch (error) {
    console.error('Mark query resolved error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get crop advisory data
const getCropAdvisory = async (req, res) => {
  try {
    const { page = 1, limit = 10, cropType, season } = req.query;
    const skip = (page - 1) * limit;

    const where = {};
    if (cropType) where.cropType = cropType;
    if (season) where.season = season;

    const advisories = await prisma.cropAdvisory.findMany({
      where,
      skip: parseInt(skip),
      take: parseInt(limit),
      orderBy: {
        createdAt: 'desc'
      }
    });

    const total = await prisma.cropAdvisory.count({ where });

    res.json({
      success: true,
      data: {
        advisories,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get crop advisory error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Add crop advisory
const addCropAdvisory = async (req, res) => {
  try {
    const { cropType, season, practices, pestDiseases, documents } = req.body;

    const advisory = await prisma.cropAdvisory.create({
      data: {
        cropType,
        season,
        practices,
        pestDiseases,
        documents: documents || []
      }
    });

    res.json({
      success: true,
      data: { advisory },
      message: 'Crop advisory added successfully'
    });
  } catch (error) {
    console.error('Add crop advisory error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get market prices
const getMarketPrices = async (req, res) => {
  try {
    const { page = 1, limit = 10, cropType, location } = req.query;
    const skip = (page - 1) * limit;

    const where = {};
    if (cropType) where.cropType = cropType;
    if (location) where.location = location;

    const prices = await prisma.marketPrice.findMany({
      where,
      skip: parseInt(skip),
      take: parseInt(limit),
      orderBy: {
        date: 'desc'
      }
    });

    const total = await prisma.marketPrice.count({ where });

    res.json({
      success: true,
      data: {
        prices,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get market prices error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update market prices
const updateMarketPrices = async (req, res) => {
  try {
    const { prices } = req.body; // Array of price objects

    const updatedPrices = await prisma.$transaction(
      prices.map(price => 
        prisma.marketPrice.upsert({
          where: {
            cropType_location_date: {
              cropType: price.cropType,
              location: price.location,
              date: new Date(price.date)
            }
          },
          update: {
            price: price.price,
            unit: price.unit,
            source: price.source
          },
          create: {
            cropType: price.cropType,
            location: price.location,
            date: new Date(price.date),
            price: price.price,
            unit: price.unit,
            source: price.source
          }
        })
      )
    );

    res.json({
      success: true,
      data: { prices: updatedPrices },
      message: 'Market prices updated successfully'
    });
  } catch (error) {
    console.error('Update market prices error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Send bulk notifications
const sendBulkNotifications = async (req, res) => {
  try {
    const { title, message, targetType, targetValue, notificationType } = req.body;

    // Create notification record
    const notification = await prisma.notification.create({
      data: {
        title,
        message,
        targetType,
        targetValue,
        notificationType,
        status: 'PENDING'
      }
    });

    // TODO: Implement actual notification sending logic
    // This would integrate with FCM, SMS, or email services

    res.json({
      success: true,
      data: { notification },
      message: 'Bulk notification queued successfully'
    });
  } catch (error) {
    console.error('Send bulk notification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get reports and analytics
const getReports = async (req, res) => {
  try {
    const { reportType, startDate, endDate } = req.query;

    let reportData = {};

    switch (reportType) {
      case 'farmer_registration':
        reportData = await getFarmerRegistrationReport(startDate, endDate);
        break;
      case 'query_resolution':
        reportData = await getQueryResolutionReport(startDate, endDate);
        break;
      case 'crop_issues':
        reportData = await getCropIssuesReport(startDate, endDate);
        break;
      case 'market_trends':
        reportData = await getMarketTrendsReport(startDate, endDate);
        break;
      default:
        return res.status(400).json({ error: 'Invalid report type' });
    }

    res.json({
      success: true,
      data: reportData
    });
  } catch (error) {
    console.error('Get reports error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Helper functions for reports
const getFarmerRegistrationReport = async (startDate, endDate) => {
  const where = {};
  if (startDate && endDate) {
    where.createdAt = {
      gte: new Date(startDate),
      lte: new Date(endDate)
    };
  }

  const farmers = await prisma.farmer.findMany({
    where,
    include: {
      user: {
        select: {
          createdAt: true,
          village: true,
          district: true,
          state: true
        }
      }
    }
  });

  // Group by region
  const byRegion = farmers.reduce((acc, farmer) => {
    const region = `${farmer.user.district}, ${farmer.user.state}`;
    acc[region] = (acc[region] || 0) + 1;
    return acc;
  }, {});

  return {
    totalFarmers: farmers.length,
    byRegion,
    farmers
  };
};

const getQueryResolutionReport = async (startDate, endDate) => {
  const where = {};
  if (startDate && endDate) {
    where.createdAt = {
      gte: new Date(startDate),
      lte: new Date(endDate)
    };
  }

  const queries = await prisma.farmerQuery.findMany({
    where,
    include: {
      farmer: {
        include: {
          user: true
        }
      }
    }
  });

  const byStatus = queries.reduce((acc, query) => {
    acc[query.status] = (acc[query.status] || 0) + 1;
    return acc;
  }, {});

  const byCropType = queries.reduce((acc, query) => {
    const cropType = query.cropType || 'Unknown';
    acc[cropType] = (acc[cropType] || 0) + 1;
    return acc;
  }, {});

  return {
    totalQueries: queries.length,
    byStatus,
    byCropType,
    queries
  };
};

const getCropIssuesReport = async (startDate, endDate) => {
  const where = {};
  if (startDate && endDate) {
    where.createdAt = {
      gte: new Date(startDate),
      lte: new Date(endDate)
    };
  }

  const queries = await prisma.farmerQuery.findMany({
    where: {
      ...where,
      category: 'PEST_DISEASE'
    },
    include: {
      farmer: {
        include: {
          user: true
        }
      }
    }
  });

  const byPestDisease = queries.reduce((acc, query) => {
    const issue = query.issueType || 'Unknown';
    acc[issue] = (acc[issue] || 0) + 1;
    return acc;
  }, {});

  return {
    totalIssues: queries.length,
    byPestDisease,
    queries
  };
};

const getMarketTrendsReport = async (startDate, endDate) => {
  const where = {};
  if (startDate && endDate) {
    where.date = {
      gte: new Date(startDate),
      lte: new Date(endDate)
    };
  }

  const prices = await prisma.marketPrice.findMany({
    where,
    orderBy: {
      date: 'asc'
    }
  });

  const byCropType = prices.reduce((acc, price) => {
    if (!acc[price.cropType]) {
      acc[price.cropType] = [];
    }
    acc[price.cropType].push({
      date: price.date,
      price: price.price,
      location: price.location
    });
    return acc;
  }, {});

  return {
    totalPrices: prices.length,
    byCropType,
    prices
  };
};

module.exports = {
  getDashboardStats,
  getFarmerQueries,
  assignQueryToExpert,
  replyToQuery,
  markQueryResolved,
  getCropAdvisory,
  addCropAdvisory,
  getMarketPrices,
  updateMarketPrices,
  sendBulkNotifications,
  getReports
};
