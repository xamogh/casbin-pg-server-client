// client.js

const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");

// Configuration
const config = {
  grpc: {
    host: process.env.GRPC_HOST || "localhost",
    port: process.env.GRPC_PORT || "50051",
  },
};

// Load the proto file
const PROTO_PATH = "./casbin.proto";
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const protoDescriptor = grpc.loadPackageDefinition(packageDefinition);
const casbinService = protoDescriptor.proto.Casbin;

// Create gRPC client
const grpcClient = new casbinService(
  `${config.grpc.host}:${config.grpc.port}`,
  grpc.credentials.createInsecure()
);

let enforcerHandler = null;
let adapterHandler = null;

// Initialize adapter and enforcer
async function initializeAdapterAndEnforcer(connectString) {
  return new Promise(async (resolve, reject) => {
    try {
      // Create PostgreSQL adapter
      const adapterResponse = await new Promise((resolve, reject) => {
        grpcClient.NewAdapter(
          {
            adapterName: "postgres",
            driverName: "postgres",
            connectString: connectString,
            dbSpecified: true,
          },
          (error, response) => {
            if (error) {
              console.error("Adapter creation error:", error);
              reject(error);
            } else {
              resolve(response);
            }
          }
        );
      });

      adapterHandler = adapterResponse.handler;
      console.log("Adapter initialized with handler:", adapterHandler);

      const modelText = `
[request_definition]
r = sub, obj, act

[policy_definition]
p = sub, obj, act

[role_definition]
g = _, _

[policy_effect]
e = some(where (p.eft == allow))

[matchers]
m = g(r.sub, p.sub) && r.obj == p.obj && r.act == p.act
`;

      const enforcerResponse = await new Promise((resolve, reject) => {
        grpcClient.NewEnforcer(
          {
            modelText: modelText,
            adapterHandle: adapterHandler,
            enableAcceptJsonRequest: true,
          },
          (error, response) => {
            if (error) {
              console.error("Enforcer creation error:", error);
              reject(error);
            } else {
              resolve(response);
            }
          }
        );
      });

      enforcerHandler = enforcerResponse.handler;
      console.log("Enforcer initialized with handler:", enforcerHandler);

      await new Promise((resolve, reject) => {
        grpcClient.LoadPolicy(
          { handler: enforcerHandler },
          (error, response) => {
            if (error) {
              console.error("Policy loading error:", error);
              reject(error);
            } else {
              resolve(response);
            }
          }
        );
      });

      console.log("Policy loaded successfully");
      resolve();
    } catch (error) {
      console.error("Initialization error:", error);
      reject(error);
    }
  });
}

// Exported functions that wrap gRPC client methods

function addPolicy(sub, obj, act) {
  return new Promise((resolve, reject) => {
    const request = {
      enforcerHandler: enforcerHandler,
      pType: "p",
      params: [sub, obj, act],
    };

    grpcClient.AddPolicy(request, (error, response) => {
      if (error) {
        reject(error);
      } else {
        resolve(response.res);
      }
    });
  });
}

function getPolicies() {
  return new Promise((resolve, reject) => {
    const request = {
      handler: enforcerHandler,
    };

    grpcClient.GetPolicy(request, (error, response) => {
      if (error) {
        reject(error);
      } else {
        const policies = response.d2.map((policy) => ({
          sub: policy.d1[0],
          obj: policy.d1[1],
          act: policy.d1[2],
        }));
        resolve(policies);
      }
    });
  });
}

function enforce(sub, obj, act) {
  return new Promise((resolve, reject) => {
    const request = {
      enforcerHandler: enforcerHandler,
      params: [sub, obj, act],
    };

    grpcClient.Enforce(request, (error, response) => {
      if (error) {
        reject(error);
      } else {
        resolve(response.res);
      }
    });
  });
}

function removePolicy(sub, obj, act) {
  return new Promise((resolve, reject) => {
    const request = {
      enforcerHandler: enforcerHandler,
      pType: "p",
      params: [sub, obj, act],
    };

    grpcClient.RemovePolicy(request, (error, response) => {
      if (error) {
        reject(error);
      } else {
        resolve(response.res);
      }
    });
  });
}

// Add Grouping Policy
function addGroupingPolicy(user, role) {
  return new Promise((resolve, reject) => {
    const request = {
      enforcerHandler: enforcerHandler,
      pType: "g",
      params: [user, role],
    };

    grpcClient.AddGroupingPolicy(request, (error, response) => {
      if (error) {
        reject(error);
      } else {
        resolve(response.res);
      }
    });
  });
}

// Remove Grouping Policy
function removeGroupingPolicy(user, role) {
  return new Promise((resolve, reject) => {
    const request = {
      enforcerHandler: enforcerHandler,
      pType: "g",
      params: [user, role],
    };

    grpcClient.RemoveGroupingPolicy(request, (error, response) => {
      if (error) {
        reject(error);
      } else {
        resolve(response.res);
      }
    });
  });
}

// Get Roles for User
function getRolesForUser(user) {
  return new Promise((resolve, reject) => {
    const request = {
      enforcerHandler: enforcerHandler,
      user: user,
    };

    grpcClient.GetRolesForUser(request, (error, response) => {
      if (error) {
        reject(error);
      } else {
        resolve(response.array);
      }
    });
  });
}

// Get Users for Role
function getUsersForRole(role) {
  return new Promise((resolve, reject) => {
    const request = {
      enforcerHandler: enforcerHandler,
      role: role,
    };

    grpcClient.GetUsersForRole(request, (error, response) => {
      if (error) {
        reject(error);
      } else {
        resolve(response.array);
      }
    });
  });
}

// Get Permissions for User
function getPermissionsForUser(user) {
  return new Promise((resolve, reject) => {
    const request = {
      enforcerHandler: enforcerHandler,
      user: user,
    };

    grpcClient.GetPermissionsForUser(request, (error, response) => {
      if (error) {
        reject(error);
      } else {
        const permissions = response.d2.map((policy) => policy.d1);
        resolve(permissions);
      }
    });
  });
}

// Add Permission
function addPermission(user, obj, act) {
  return addPolicy(user, obj, act);
}

// Remove Permission
function removePermission(user, obj, act) {
  return removePolicy(user, obj, act);
}

// Check Has Permission
function hasPermission(user, obj, act) {
  return new Promise((resolve, reject) => {
    const request = {
      enforcerHandler: enforcerHandler,
      pType: "p",
      params: [user, obj, act],
    };

    grpcClient.HasPolicy(request, (error, response) => {
      if (error) {
        reject(error);
      } else {
        resolve(response.res);
      }
    });
  });
}

// Get All Subjects
function getAllSubjects() {
  return new Promise((resolve, reject) => {
    grpcClient.GetAllSubjects(
      { handler: enforcerHandler },
      (error, response) => {
        if (error) {
          reject(error);
        } else {
          resolve(response.array);
        }
      }
    );
  });
}

// Get All Objects
function getAllObjects() {
  return new Promise((resolve, reject) => {
    grpcClient.GetAllObjects(
      { handler: enforcerHandler },
      (error, response) => {
        if (error) {
          reject(error);
        } else {
          resolve(response.array);
        }
      }
    );
  });
}

// Get All Actions
function getAllActions() {
  return new Promise((resolve, reject) => {
    grpcClient.GetAllActions(
      { handler: enforcerHandler },
      (error, response) => {
        if (error) {
          reject(error);
        } else {
          resolve(response.array);
        }
      }
    );
  });
}

// Get All Roles
function getAllRoles() {
  return new Promise((resolve, reject) => {
    grpcClient.GetAllRoles({ handler: enforcerHandler }, (error, response) => {
      if (error) {
        reject(error);
      } else {
        resolve(response.array);
      }
    });
  });
}

// Export the functions
module.exports = {
  initializeAdapterAndEnforcer,
  addPolicy,
  getPolicies,
  enforce,
  removePolicy,
  addGroupingPolicy,
  removeGroupingPolicy,
  getRolesForUser,
  getUsersForRole,
  getPermissionsForUser,
  addPermission,
  removePermission,
  hasPermission,
  getAllSubjects,
  getAllObjects,
  getAllActions,
  getAllRoles,
};
