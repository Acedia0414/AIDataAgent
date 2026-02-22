import { Router } from 'express';
import { commentsDataService, CommentData } from '../commentsDataService';

const router = Router();

// 获取所有Fields映射知识
router.get('/', async (req, res) => {
  try {
    const comments = await commentsDataService.getAllComments();
    res.json({
      success: true,
      data: comments,
      count: comments.length
    });
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch comments'
    });
  }
});

// Get field mapping knowledge for specified table
router.get('/table/:tableName', async (req, res) => {
  try {
    const { tableName } = req.params;
    const comments = await commentsDataService.getCommentsByTable(tableName);
    res.json({
      success: true,
      data: comments,
      count: comments.length
    });
  } catch (error) {
    console.error('Error fetching table comments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch table comments'
    });
  }
});

// Add or update field mapping knowledge
router.post('/', async (req, res) => {
  try {
    const commentData: Omit<CommentData, 'id' | 'createdAt' | 'updatedAt'> = req.body;
    
    if (!commentData.tableName || !commentData.fieldName || !commentData.comments) {
      return res.status(400).json({
        success: false,
        error: 'tableName, fieldName, and comments are required'
      });
    }
    
    const comment = await commentsDataService.upsertComment(commentData);
    res.json({
      success: true,
      data: comment,
      message: 'Comment saved successfully'
    });
  } catch (error) {
    console.error('Error saving comment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save comment'
    });
  }
});

// 根据业务含义搜索Fields映射
router.get('/search/:query', async (req, res) => {
  try {
    const { query } = req.params;
    const comments = await commentsDataService.searchComments(query);
    res.json({
      success: true,
      data: comments,
      count: comments.length
    });
  } catch (error) {
    console.error('Error searching comments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search comments'
    });
  }
});

// 根据业务含义查找指定表的Fields映射
router.get('/table/:tableName/meaning/:businessMeaning', async (req, res) => {
  try {
    const { tableName, businessMeaning } = req.params;
    const comments = await commentsDataService.findFieldByBusinessMeaning(tableName, businessMeaning);
    res.json({
      success: true,
      data: comments,
      count: comments.length
    });
  } catch (error) {
    console.error('Error finding field by meaning:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to find field by meaning'
    });
  }
});

// Delete field mapping knowledge
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const success = await commentsDataService.deleteComment(parseInt(id));
    
    if (success) {
      res.json({
        success: true,
        message: 'Comment deleted successfully'
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Comment not found'
      });
    }
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete comment'
    });
  }
});

// Bulk import field mapping knowledge
router.post('/bulk', async (req, res) => {
  try {
    const comments: Omit<CommentData, 'id' | 'createdAt' | 'updatedAt'>[] = req.body;
    
    if (!Array.isArray(comments) || comments.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Comments array is required'
      });
    }
    
    const imported = await commentsDataService.bulkImport(comments);
    res.json({
      success: true,
      data: { imported },
      message: `Successfully imported ${imported} comments`
    });
  } catch (error) {
    console.error('Error bulk importing comments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to bulk import comments'
    });
  }
});

export default router;
