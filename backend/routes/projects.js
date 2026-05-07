const router = require('express').Router();
const mongoose = require('mongoose');
const Project = require('../models/Project');
const Task = require('../models/Task');
const { protect } = require('../middleware/auth');

router.use(protect);

// ================= GET ALL PROJECTS =================
router.get('/', async (req, res) => {
  try {
    const projects = await Project.find({
      $or: [{ owner: req.user._id }, { members: req.user._id }],
    })
      .populate('owner', 'name email')
      .populate('members', 'name email role')
      .lean();

    const projectIds = projects.map((p) => p._id);

    const taskCounts = await Task.aggregate([
      { $match: { project: { $in: projectIds } } },
      {
        $group: {
          _id: { project: '$project', status: '$status' },
          count: { $sum: 1 },
        },
      },
    ]);

    const countMap = {};
    taskCounts.forEach(({ _id, count }) => {
      const pid = _id.project.toString();
      if (!countMap[pid]) countMap[pid] = {};
      countMap[pid][_id.status] = count;
    });

    const result = projects.map((p) => ({
      ...p,
      taskCounts: countMap[p._id.toString()] || {},
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ================= CREATE PROJECT =================
// 🔥 FIXED HERE (adminOnly हटाया)
router.post('/', async (req, res) => {
  try {
    const { name, description, status } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Name is required' });
    }

    const project = await Project.create({
      name,
      description,
      status,
      owner: req.user._id,
      members: [req.user._id],
    });

    await project.populate('owner', 'name email');

    res.status(201).json(project);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ================= GET SINGLE PROJECT =================
router.get('/:id', async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('owner', 'name email role')
      .populate('members', 'name email role');

    if (!project) return res.status(404).json({ message: 'Project not found' });

    const isMember =
      project.owner._id.equals(req.user._id) ||
      project.members.some((m) => m._id.equals(req.user._id));

    if (!isMember) return res.status(403).json({ message: 'Access denied' });

    res.json(project);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ================= UPDATE PROJECT =================
router.put('/:id', async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) return res.status(404).json({ message: 'Project not found' });

    if (!project.owner.equals(req.user._id)) {
      return res.status(403).json({ message: 'Only owner can update project' });
    }

    const { name, description, status } = req.body;

    if (name) project.name = name;
    if (description !== undefined) project.description = description;
    if (status) project.status = status;

    await project.save();

    await project.populate('owner', 'name email');
    await project.populate('members', 'name email role');

    res.json(project);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ================= DELETE PROJECT =================
router.delete('/:id', async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) return res.status(404).json({ message: 'Project not found' });

    if (!project.owner.equals(req.user._id)) {
      return res.status(403).json({ message: 'Only owner can delete project' });
    }

    await Task.deleteMany({ project: project._id });
    await project.deleteOne();

    res.json({ message: 'Project deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ================= GET PROJECT TASKS =================
router.get('/:id/tasks', async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) return res.status(404).json({ message: 'Project not found' });

    const isMember =
      project.owner.equals(req.user._id) ||
      project.members.some((m) => m.equals(req.user._id));

    if (!isMember) return res.status(403).json({ message: 'Access denied' });

    const tasks = await Task.find({ project: req.params.id })
      .populate('assignee', 'name email')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    res.json(tasks);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;