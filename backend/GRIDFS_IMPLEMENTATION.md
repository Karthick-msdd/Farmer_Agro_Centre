# GridFS Implementation for Profile Photos

## Overview

This document explains how GridFS is implemented in the Farming Agro Center application for storing and retrieving profile photos.

## What is GridFS?

GridFS is MongoDB's specification for storing and retrieving files that exceed the BSON document size limit of 16 MB. It's perfect for storing images, videos, and other large files.

## Key Benefits of GridFS

1. **Large File Support**: Can store files larger than 16MB
2. **Efficient Storage**: Automatically chunks large files
3. **Metadata Support**: Store file metadata alongside the file
4. **Streaming**: Efficient streaming of large files
5. **Indexing**: Built-in indexing for fast file retrieval
6. **Atomic Operations**: File operations are atomic

## Implementation Details

### 1. GridFS Setup

```javascript
const { GridFSBucket } = require('mongodb');

// Initialize GridFS with custom bucket name
const gfs = new GridFSBucket(db, {
  bucketName: 'profile_photos'
});
```

### 2. File Upload Process

```javascript
// Upload file to GridFS
const uploadStream = gfs.openUploadStream(filename, {
  metadata: {
    userId: userId,
    contentType: file.mimetype,
    uploadedAt: new Date()
  }
});

uploadStream.end(fileBuffer);
```

### 3. File Retrieval

```javascript
// Download file from GridFS
const downloadStream = gfs.openDownloadStream(fileId);
downloadStream.pipe(response);
```

### 4. File Deletion

```javascript
// Delete file from GridFS
await gfs.delete(fileId);
```

## API Endpoints

### Upload Profile Photo
- **Endpoint**: `POST /api/user/upload-photo`
- **Method**: POST
- **Content-Type**: multipart/form-data
- **Body**: FormData with 'profilePhoto' field
- **Response**: 
  ```json
  {
    "success": true,
    "message": "Profile photo uploaded successfully",
    "photoId": "64f8a1b2c3d4e5f6a7b8c9d0"
  }
  ```

### Get Profile Photo
- **Endpoint**: `GET /api/user/profile-photo`
- **Method**: GET
- **Headers**: Authorization: Bearer <token>
- **Response**: Binary image data with appropriate content-type headers

### Delete Profile Photo
- **Endpoint**: `DELETE /api/user/profile-photo`
- **Method**: DELETE
- **Headers**: Authorization: Bearer <token>
- **Response**:
  ```json
  {
    "success": true,
    "message": "Profile photo deleted successfully"
  }
  ```

## Database Schema

### Users Collection
```javascript
{
  _id: ObjectId,
  name: String,
  email: String,
  phone: String,
  role: String,
  profilePhotoId: String, // Reference to GridFS file
  createdAt: Date,
  updatedAt: Date
}
```

### GridFS Collections
- `profile_photos.files`: File metadata
- `profile_photos.chunks`: File data chunks

## File Storage Process

1. **Upload Request**: User uploads image via frontend
2. **Validation**: Server validates file type and size
3. **Delete Existing**: Remove any existing profile photo
4. **GridFS Upload**: Upload new file to GridFS
5. **Update User**: Store file ID in user document
6. **Response**: Return success with file ID

## File Retrieval Process

1. **Request**: User requests profile photo
2. **User Lookup**: Find user by authentication token
3. **File ID**: Get profilePhotoId from user document
4. **GridFS Download**: Stream file from GridFS
5. **Response**: Return binary image data

## Advantages Over Base64 Storage

| Aspect | Base64 Storage | GridFS Storage |
|--------|----------------|----------------|
| **File Size Limit** | 16MB BSON limit | No practical limit |
| **Memory Usage** | High (entire file in memory) | Low (streaming) |
| **Performance** | Slower for large files | Faster for large files |
| **Storage Efficiency** | 33% overhead | No overhead |
| **Scalability** | Limited | Highly scalable |
| **Metadata** | Limited | Rich metadata support |

## Security Considerations

1. **File Type Validation**: Only allow image files
2. **Size Limits**: Enforce reasonable file size limits
3. **Authentication**: Require valid JWT tokens
4. **User Isolation**: Users can only access their own photos
5. **Content-Type Headers**: Proper MIME type handling

## Error Handling

### Common Errors

1. **File Too Large**: Return 413 Payload Too Large
2. **Invalid File Type**: Return 400 Bad Request
3. **Authentication Failed**: Return 401 Unauthorized
4. **File Not Found**: Return 404 Not Found
5. **GridFS Error**: Return 500 Internal Server Error

### Error Response Format
```json
{
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

## Performance Optimization

1. **Streaming**: Use streams for large file operations
2. **Caching**: Implement appropriate cache headers
3. **Compression**: Consider image compression
4. **CDN**: Use CDN for frequently accessed images
5. **Indexing**: Ensure proper database indexing

## Monitoring and Maintenance

### Health Check
```javascript
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    database: db ? 'Connected' : 'Disconnected',
    gridfs: gfs ? 'Initialized' : 'Not initialized'
  });
});
```

### GridFS Statistics
```javascript
// Get GridFS statistics
const stats = await db.stats();
const gridfsStats = await gfs.find({}).toArray();
```

## Testing

### Test GridFS Functionality
```bash
node test-gridfs.js
```

### Manual Testing
1. Upload a profile photo via API
2. Retrieve the profile photo
3. Verify file is stored in GridFS
4. Delete the profile photo
5. Verify file is removed from GridFS

## Migration from Base64

If migrating from base64 storage:

1. **Backup Data**: Backup existing base64 images
2. **Convert Images**: Convert base64 to files
3. **Upload to GridFS**: Upload files to GridFS
4. **Update References**: Update user documents with file IDs
5. **Remove Base64**: Remove base64 data from user documents
6. **Test**: Verify all images work correctly

## Best Practices

1. **File Naming**: Use descriptive filenames with timestamps
2. **Metadata**: Store relevant metadata with files
3. **Cleanup**: Implement cleanup for orphaned files
4. **Monitoring**: Monitor GridFS storage usage
5. **Backup**: Regular backups of GridFS data
6. **Versioning**: Consider file versioning for updates

## Troubleshooting

### Common Issues

1. **Connection Errors**: Check MongoDB connection string
2. **Permission Errors**: Verify database permissions
3. **File Not Found**: Check file ID references
4. **Memory Issues**: Use streaming for large files
5. **Performance**: Monitor GridFS performance

### Debug Commands

```javascript
// List all files in GridFS
const files = await gfs.find({}).toArray();

// Check file metadata
const file = await gfs.find({ _id: fileId }).toArray();

// Get file info
const fileInfo = await gfs.find({ filename: filename }).toArray();
```

## Conclusion

GridFS provides a robust, scalable solution for storing profile photos and other large files in MongoDB. It offers better performance, scalability, and storage efficiency compared to base64 storage, making it ideal for production applications.
