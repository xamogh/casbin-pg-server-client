// server.js

// Import required modules
const express = require("express");
const app = express();
app.use(express.json());

// Import client.js
const client = require("./client");

// Configuration
const config = {
  postgres: {
    host: process.env.DB_HOST || "172.17.0.1", // Docker default bridge IP
    port: process.env.DB_PORT || "5432",
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "mysecretpassword",
    database: process.env.DB_NAME || "casbin",
  },
};

// Initialize adapter and enforcer when server starts
async function initialize() {
  try {
    // Construct PostgreSQL connection string
    const connectString = `host=${config.postgres.host} port=${config.postgres.port} user=${config.postgres.user} password=${config.postgres.password} dbname=${config.postgres.database} sslmode=disable`;
    console.log("Attempting to connect with:", connectString);

    // Initialize client
    await client.initializeAdapterAndEnforcer(connectString);
  } catch (error) {
    console.error("Initialization error:", error);
    throw error;
  }
}

// Add Policy
app.post("/policy", async (req, res) => {
  const { sub, obj, act } = req.body;

  if (!sub || !obj || !act) {
    return res
      .status(400)
      .json({ error: "Missing required parameters: sub, obj, act" });
  }

  try {
    const success = await client.addPolicy(sub, obj, act);
    res.json({ success });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Get Policies
app.get("/policies", async (req, res) => {
  try {
    const policies = await client.getPolicies();
    res.json(policies);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Enforce
app.post("/enforce", async (req, res) => {
  const { sub, obj, act } = req.body;

  if (!sub || !obj || !act) {
    return res
      .status(400)
      .json({ error: "Missing required parameters: sub, obj, act" });
  }

  try {
    const allowed = await client.enforce(sub, obj, act);
    res.json({ allowed });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Remove Policy
app.delete("/policy", async (req, res) => {
  const { sub, obj, act } = req.body;

  if (!sub || !obj || !act) {
    return res
      .status(400)
      .json({ error: "Missing required parameters: sub, obj, act" });
  }

  try {
    const success = await client.removePolicy(sub, obj, act);
    res.json({ success });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Add Grouping Policy (Role Assignment)
app.post("/grouping-policy", async (req, res) => {
  const { user, role } = req.body;

  if (!user || !role) {
    return res
      .status(400)
      .json({ error: "Missing required parameters: user, role" });
  }

  try {
    const success = await client.addGroupingPolicy(user, role);
    res.json({ success });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Remove Grouping Policy (Role Revocation)
app.delete("/grouping-policy", async (req, res) => {
  const { user, role } = req.body;

  if (!user || !role) {
    return res
      .status(400)
      .json({ error: "Missing required parameters: user, role" });
  }

  try {
    const success = await client.removeGroupingPolicy(user, role);
    res.json({ success });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Get Roles for a User
app.get("/roles/:user", async (req, res) => {
  const user = req.params.user;

  if (!user) {
    return res.status(400).json({ error: "Missing required parameter: user" });
  }

  try {
    const roles = await client.getRolesForUser(user);
    res.json({ roles });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Get Users for a Role
app.get("/users/:role", async (req, res) => {
  const role = req.params.role;

  if (!role) {
    return res.status(400).json({ error: "Missing required parameter: role" });
  }

  try {
    const users = await client.getUsersForRole(role);
    res.json({ users });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Get Permissions for a User
app.get("/permissions/:user", async (req, res) => {
  const user = req.params.user;

  if (!user) {
    return res.status(400).json({ error: "Missing required parameter: user" });
  }

  try {
    const permissions = await client.getPermissionsForUser(user);
    res.json({ permissions });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Add Permission for a User
app.post("/permission", async (req, res) => {
  const { user, obj, act } = req.body;

  if (!user || !obj || !act) {
    return res
      .status(400)
      .json({ error: "Missing required parameters: user, obj, act" });
  }

  try {
    const success = await client.addPermission(user, obj, act);
    res.json({ success });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Remove Permission for a User
app.delete("/permission", async (req, res) => {
  const { user, obj, act } = req.body;

  if (!user || !obj || !act) {
    return res
      .status(400)
      .json({ error: "Missing required parameters: user, obj, act" });
  }

  try {
    const success = await client.removePermission(user, obj, act);
    res.json({ success });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Check If User Has a Specific Permission
app.get("/has-permission", async (req, res) => {
  const { user, obj, act } = req.query;

  if (!user || !obj || !act) {
    return res.status(400).json({
      error: "Missing required query parameters: user, obj, act",
    });
  }

  try {
    const hasPermission = await client.hasPermission(user, obj, act);
    res.json({ hasPermission });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Get All Subjects
app.get("/subjects", async (req, res) => {
  try {
    const subjects = await client.getAllSubjects();
    res.json({ subjects });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Get All Objects
app.get("/objects", async (req, res) => {
  try {
    const objects = await client.getAllObjects();
    res.json({ objects });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Get All Actions
app.get("/actions", async (req, res) => {
  try {
    const actions = await client.getAllActions();
    res.json({ actions });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Get All Roles
app.get("/roles", async (req, res) => {
  try {
    const roles = await client.getAllRoles();
    res.json({ roles });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Initialize and start the server
initialize()
  .then(() => {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Failed to initialize server:", err);
    process.exit(1);
  });
