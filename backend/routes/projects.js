const router = require('express').Router();
const Project = require('../models/Project');
const Task = require('../models/Task');
const { protect, adminOnly } = require('../middleware/auth');

router.use(protect);

// Get all projects user is owner or member of
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
      { $group: { _id: { project: '$project', status: '$status' }, count: { $sum: 1 } } },
    ]);

    const countMap = {};
    taskCounts.forEach(({ _id, count }) => {
      if (!countMap[_id.project]) countMap[_id.project] = {};
      countMap[_id.project][_id.status] = count;
    });

    const result = projects.map((p) => ({
      ...p,
      taskCounts: countMap[p._id] || {},
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create project (admin only)
router.post('/', adminOnly, async (req, res) => {
  try {
    const { name, description, status } = req.body;
    if (!name) return res.status(400).json({ message: 'Name is required' });

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

// Get single project
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

// Update project (owner only)
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

// Delete project (owner only)
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

// Add member
router.post('/:id/members', async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });
    if (!project.owner.equals(req.user._id)) {
      return res.status(403).json({ message: 'Only owner can add members' });
    }
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ message: 'userId required' });
    if (project.members.includes(userId)) {
      return res.status(400).json({ message: 'User already a member' });
    }
    project.members.push(userId);
    await project.save();
    await project.populate('members', 'name email role');
    res.json(project.members);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Remove member
router.delete('/:id/members/:userId', async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });
    if (!project.owner.equals(req.user._id)) {
      return res.status(403).json({ message: 'Only owner can remove members' });
    }
    if (project.owner.equals(req.params.userId)) {
      return res.status(400).json({ message: 'Cannot remove project owner' });
    }
    project.members = project.members.filter((m) => !m.equals(req.params.userId));
    await project.save();
    res.json({ message: 'Member removed' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get tasks for a project
router.get('/:id/tasks', async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const isMember =
      project.owner.equals(req.user._id) || project.members.includes(req.user._id);
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
