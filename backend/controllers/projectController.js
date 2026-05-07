const Project = require('../models/Project');

// CREATE PROJECT
exports.createProject = async (req, res) => {
  try {
    const project = await Project.create({
      name: req.body.name,
      description: req.body.description,
      owner: req.user._id,
      members: [req.user._id]
    });

    res.status(201).json(project);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET PROJECTS
exports.getProjects = async (req, res) => {
  try {
    const projects = await Project.find({
      members: req.user._id
    });

    res.json(projects);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};