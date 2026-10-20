import { Router } from 'express';
import mongoose from 'mongoose';
import Task from '../models/Task.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

const cleanTaskInput = body => {
  const result = {};
  if (body.title !== undefined) {
    const title = String(body.title).trim();
    if (!title || title.length > 160) throw Object.assign(new Error('Title is required and must be under 160 characters.'), { status: 400 });
    result.title = title;
  }
  if (body.description !== undefined) result.description = String(body.description).trim().slice(0, 3000);
  if (body.status !== undefined) {
    if (!['todo', 'in-progress', 'completed'].includes(body.status)) throw Object.assign(new Error('Invalid status.'), { status: 400 });
    result.status = body.status;
  }
  if (body.priority !== undefined) {
    if (!['low', 'medium', 'high'].includes(body.priority)) throw Object.assign(new Error('Invalid priority.'), { status: 400 });
    result.priority = body.priority;
  }
  if (body.dueDate !== undefined) {
    if (!body.dueDate) result.dueDate = null;
    else {
      const date = new Date(body.dueDate);
      if (Number.isNaN(date.getTime())) throw Object.assign(new Error('Invalid due date.'), { status: 400 });
      result.dueDate = date;
    }
  }
  if (body.important !== undefined) result.important = Boolean(body.important);
  return result;
};

router.get('/', async (req, res, next) => {
  try {
    const filter = { user: req.user.id };
    if (req.query.status && ['todo', 'in-progress', 'completed'].includes(req.query.status)) filter.status = req.query.status;
    if (req.query.priority && ['low', 'medium', 'high'].includes(req.query.priority)) filter.priority = req.query.priority;
    if (req.query.search) filter.$or = [
      { title: { $regex: String(req.query.search).slice(0, 80), $options: 'i' } },
      { description: { $regex: String(req.query.search).slice(0, 80), $options: 'i' } }
    ];
    res.json({ tasks: await Task.find(filter).sort({ createdAt: -1 }).lean() });
  } catch (error) { next(error); }
});

router.post('/', async (req, res, next) => {
  try {
    const task = await Task.create({ ...cleanTaskInput(req.body), user: req.user.id });
    req.app.get('io')?.emit('task:changed', { userId: req.user.id, action: 'created', task });
    res.status(201).json({ task });
  } catch (error) { next(error); }
});

router.get('/:id', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid task ID.' });
    const task = await Task.findOne({ _id: req.params.id, user: req.user.id });
    if (!task) return res.status(404).json({ message: 'Task not found.' });
    res.json({ task });
  } catch (error) { next(error); }
});

router.patch('/:id', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid task ID.' });
    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { $set: cleanTaskInput(req.body) },
      { new: true, runValidators: true }
    );
    if (!task) return res.status(404).json({ message: 'Task not found.' });
    req.app.get('io')?.emit('task:changed', { userId: req.user.id, action: 'updated', task });
    res.json({ task });
  } catch (error) { next(error); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid task ID.' });
    const task = await Task.findOneAndDelete({ _id: req.params.id, user: req.user.id });
    if (!task) return res.status(404).json({ message: 'Task not found.' });
    req.app.get('io')?.emit('task:changed', { userId: req.user.id, action: 'deleted', taskId: req.params.id });
    res.json({ message: 'Task deleted.' });
  } catch (error) { next(error); }
});

export default router;
