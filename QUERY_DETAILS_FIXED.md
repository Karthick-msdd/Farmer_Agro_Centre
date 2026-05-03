# Query Details Issue - FIXED ✅

## Problem
When clicking on a query in the "My Queries" page, the frontend showed "Failed to load query details" error. The browser was making a request to `/api/queries/:id` which returned a 404 error.

## Root Cause
The advisory routes were missing an endpoint to fetch a single query by ID. The existing routes only supported:
- GET `/api/queries` - Get all queries for the user
- POST `/api/queries` - Create a new query
- PUT `/api/queries/:id` - Update a query
- POST `/api/queries/:id/reply` - Reply to a query (admin/agronomist only)

But there was no:
- GET `/api/queries/:id` - Get a single query by ID ❌

## Solution
Added the missing endpoint in two steps:

### 1. Added Controller Function (`backend/src/controllers/advisory.ts`)
```typescript
export const getAdvisoryRequestById = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid query ID'
      });
    }

    const db = getMongoDB();
    const queriesCollection = db.collection('queries');
    
    // Get the specific query for this user
    const query = await queriesCollection.findOne({
      _id: new ObjectId(id),
      userId: new ObjectId(req.user!.id) // Ensure user owns this query
    });

    if (!query) {
      return res.status(404).json({
        success: false,
        error: 'Query not found'
      });
    }

    return res.json({
      success: true,
      data: { query }
    });
  } catch (err) {
    console.error('getAdvisoryRequestById error:', err);
    return res.status(500).json({ 
      success: false,
      error: 'Failed to fetch query' 
    });
  }
};
```

### 2. Added Route (`backend/src/routes/advisory.ts`)
```typescript
router.get('/:id', getAdvisoryRequestById);
```

## Security Features
✅ User authentication required
✅ Users can only view their own queries (verified by userId)
✅ Validates ObjectId format before querying database
✅ Proper error handling with appropriate status codes

## Testing
The endpoint is now available at:
- **URL**: `GET /api/queries/:id`
- **Authentication**: Required (Bearer token)
- **Response**: Returns full query details including messages

## Status
✅ Controller function added
✅ Route registered
✅ Backend rebuilt
✅ Backend running successfully

## Next Step
**REFRESH YOUR BROWSER** and click on any query in your "My Queries" page. The query details should now load successfully! 🎉

