// Farmer Dashboard Controller
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Get personalized crop advisory
const getCropAdvisory = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get farmer profile
    const farmer = await prisma.farmer.findUnique({
      where: { userId },
      include: {
        user: true
      }
    });

    if (!farmer) {
      return res.status(404).json({ error: 'Farmer profile not found' });
    }

    const { cropTypes, farmLocation, district, state } = farmer;
    const currentSeason = getCurrentSeason();

    // Get personalized recommendations
    const recommendations = await prisma.cropAdvisory.findMany({
      where: {
        OR: [
          { cropType: { in: cropTypes || [] } },
          { season: currentSeason },
          { region: { contains: district } }
        ]
      },
      orderBy: {
        relevanceScore: 'desc'
      },
      take: 10
    });

    // Get weather data for the region
    const weatherData = await getWeatherData(farmLocation, district, state);

    res.json({
      success: true,
      data: {
        farmer,
        recommendations,
        weatherData,
        currentSeason
      }
    });
  } catch (error) {
    console.error('Get crop advisory error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get market prices
const getMarketPrices = async (req, res) => {
  try {
    const { cropType, location, days = 30 } = req.query;
    const userId = req.user.id;

    // Get farmer's location and crop preferences
    const farmer = await prisma.farmer.findUnique({
      where: { userId },
      select: { cropTypes: true, district: true, state: true }
    });

    const where = {};
    
    if (cropType) {
      where.cropType = cropType;
    } else if (farmer?.cropTypes) {
      where.cropType = { in: farmer.cropTypes };
    }

    if (location) {
      where.location = location;
    } else if (farmer?.district) {
      where.location = { contains: farmer.district };
    }

    // Get prices for the last N days
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));
    where.date = { gte: startDate };

    const prices = await prisma.marketPrice.findMany({
      where,
      orderBy: {
        date: 'desc'
      }
    });

    // Group by crop type and location for comparison
    const priceComparison = prices.reduce((acc, price) => {
      const key = `${price.cropType}_${price.location}`;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(price);
      return acc;
    }, {});

    // Calculate price trends
    const trends = Object.keys(priceComparison).map(key => {
      const priceData = priceComparison[key];
      const latest = priceData[0];
      const previous = priceData[1];
      
      return {
        cropType: latest.cropType,
        location: latest.location,
        currentPrice: latest.price,
        previousPrice: previous?.price,
        change: previous ? latest.price - previous.price : 0,
        changePercent: previous ? ((latest.price - previous.price) / previous.price) * 100 : 0,
        unit: latest.unit,
        date: latest.date
      };
    });

    res.json({
      success: true,
      data: {
        prices,
        trends,
        comparison: priceComparison
      }
    });
  } catch (error) {
    console.error('Get market prices error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get pest and disease information
const getPestDiseaseInfo = async (req, res) => {
  try {
    const { cropType, issueType, search } = req.query;

    const where = {};
    if (cropType) where.cropType = cropType;
    if (issueType) where.issueType = issueType;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { symptoms: { contains: search, mode: 'insensitive' } }
      ];
    }

    const pestDiseases = await prisma.pestDisease.findMany({
      where,
      include: {
        treatments: true,
        preventiveMeasures: true
      },
      orderBy: {
        severity: 'desc'
      }
    });

    // Get common issues for the crop type
    const commonIssues = await prisma.farmerQuery.findMany({
      where: {
        cropType,
        category: 'PEST_DISEASE',
        status: 'RESOLVED'
      },
      select: {
        issueType: true,
        description: true,
        reply: true
      },
      take: 10
    });

    res.json({
      success: true,
      data: {
        pestDiseases,
        commonIssues
      }
    });
  } catch (error) {
    console.error('Get pest disease info error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Submit farmer query
const submitQuery = async (req, res) => {
  try {
    const userId = req.user.id;
    const { 
      category, 
      cropType, 
      issueType, 
      description, 
      urgency = 'MEDIUM',
      attachments = []
    } = req.body;

    // Get farmer profile
    const farmer = await prisma.farmer.findUnique({
      where: { userId },
      include: { user: true }
    });

    if (!farmer) {
      return res.status(404).json({ error: 'Farmer profile not found' });
    }

    const query = await prisma.farmerQuery.create({
      data: {
        farmerId: farmer.id,
        category,
        cropType,
        issueType,
        description,
        urgency,
        attachments,
        status: 'PENDING'
      },
      include: {
        farmer: {
          include: {
            user: true
          }
        }
      }
    });

    // TODO: Send notification to admin/experts

    res.json({
      success: true,
      data: { query },
      message: 'Query submitted successfully'
    });
  } catch (error) {
    console.error('Submit query error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get farmer's queries
const getFarmerQueries = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10, status } = req.query;
    const skip = (page - 1) * limit;

    // Get farmer profile
    const farmer = await prisma.farmer.findUnique({
      where: { userId }
    });

    if (!farmer) {
      return res.status(404).json({ error: 'Farmer profile not found' });
    }

    const where = { farmerId: farmer.id };
    if (status) where.status = status;

    const queries = await prisma.farmerQuery.findMany({
      where,
      skip: parseInt(skip),
      take: parseInt(limit),
      include: {
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

// Get farmer profile
const getFarmerProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const farmer = await prisma.farmer.findUnique({
      where: { userId },
      include: {
        user: true
      }
    });

    if (!farmer) {
      return res.status(404).json({ error: 'Farmer profile not found' });
    }

    // Get additional stats
    const stats = await prisma.$transaction([
      prisma.farmerQuery.count({
        where: { farmerId: farmer.id }
      }),
      prisma.farmerQuery.count({
        where: { farmerId: farmer.id, status: 'RESOLVED' }
      }),
      prisma.order.count({
        where: { userId }
      })
    ]);

    const [totalQueries, resolvedQueries, totalOrders] = stats;

    res.json({
      success: true,
      data: {
        farmer,
        stats: {
          totalQueries,
          resolvedQueries,
          totalOrders,
          resolutionRate: totalQueries > 0 ? (resolvedQueries / totalQueries) * 100 : 0
        }
      }
    });
  } catch (error) {
    console.error('Get farmer profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update farmer profile
const updateFarmerProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const updateData = req.body;

    // Update user data
    if (updateData.user) {
      await prisma.user.update({
        where: { id: userId },
        data: updateData.user
      });
    }

    // Update farmer data
    const { user, ...farmerData } = updateData;
    if (Object.keys(farmerData).length > 0) {
      await prisma.farmer.update({
        where: { userId },
        data: farmerData
      });
    }

    // Get updated profile
    const farmer = await prisma.farmer.findUnique({
      where: { userId },
      include: {
        user: true
      }
    });

    res.json({
      success: true,
      data: { farmer },
      message: 'Profile updated successfully'
    });
  } catch (error) {
    console.error('Update farmer profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get weather data (mock implementation)
const getWeatherData = async (farmLocation, district, state) => {
  // In a real implementation, this would integrate with weather APIs
  return {
    temperature: 28,
    humidity: 65,
    rainfall: 0,
    windSpeed: 12,
    forecast: [
      { date: new Date(), condition: 'Sunny', temperature: 28 },
      { date: new Date(Date.now() + 86400000), condition: 'Partly Cloudy', temperature: 26 },
      { date: new Date(Date.now() + 172800000), condition: 'Rainy', temperature: 24 }
    ]
  };
};

// Get current season
const getCurrentSeason = () => {
  const month = new Date().getMonth() + 1;
  if (month >= 3 && month <= 5) return 'SUMMER';
  if (month >= 6 && month <= 8) return 'MONSOON';
  if (month >= 9 && month <= 11) return 'AUTUMN';
  return 'WINTER';
};

// Get farming tips
const getFarmingTips = async (req, res) => {
  try {
    const { cropType, season } = req.query;
    const userId = req.user.id;

    // Get farmer's crop types if not specified
    let targetCropTypes = cropType ? [cropType] : null;
    if (!targetCropTypes) {
      const farmer = await prisma.farmer.findUnique({
        where: { userId },
        select: { cropTypes: true }
      });
      targetCropTypes = farmer?.cropTypes || [];
    }

    const currentSeason = season || getCurrentSeason();

    const tips = await prisma.farmingTip.findMany({
      where: {
        OR: [
          { cropType: { in: targetCropTypes } },
          { season: currentSeason },
          { isGeneral: true }
        ]
      },
      orderBy: {
        priority: 'desc'
      },
      take: 20
    });

    res.json({
      success: true,
      data: {
        tips,
        currentSeason
      }
    });
  } catch (error) {
    console.error('Get farming tips error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  getCropAdvisory,
  getMarketPrices,
  getPestDiseaseInfo,
  submitQuery,
  getFarmerQueries,
  getFarmerProfile,
  updateFarmerProfile,
  getFarmingTips
};
