import Project from "../models/project.js";
import AppConfig from "../models/appConfig.js";
import PlayerConfig from "../models/playerConfig.js";
import Master from "../models/master.js";
import { generateID } from "../lib/helpers.js";

// CREATE NEW APP CONFIG - PROJECT OWNER / EDITOR
export const addAppConfig = async (req, res) => {
  try {
    const { projectID, name, desc, params } = req.body;
    const owner = req.session.username;

    switch (true) {
      case !projectID:
        return res.status(400).json({ message: "ProjectID is required" });
      case !name:
        return res.status(400).json({ message: "Name is required" });
      case !params || Object.keys(params).length === 0:
        return res.status(400).json({ message: "Params are required" });
    }

    // Check if Project exists & user is authorized
    const project = await Project.findOne({ status: "active", projectID });

    switch (true) {
      case !project:
        return res.status(404).json({ message: "Project not found" });
      case !project.owners.includes(owner) && !project.editors.includes(owner):
        return res.status(403).json({ message: "Unauthorized" });
    }

    // Check if AppConfig already exists
    const appConfig = await AppConfig.findOne({
      status: "active",
      projectID,
      params,
    });

    if (appConfig) {
      return res.status(409).json({
        message: "AppConfig already exists",
        appConfigId: appConfig.configID,
      });
    }

    // Create new AppConfig
    const newAppConfig = new AppConfig({
      configID: generateID(`AC_${project.name}`),
      projectID,
      companyID: project.companyID,
      name,
      desc,
      params,
    });
    await newAppConfig.save();

    res
      .status(200)
      .json({ message: "Success", appConfigId: newAppConfig.configID });
  } catch (error) {
    return res.status(500).json(error);
  }
};

// CREATE NEW PLAYER CONFIG - PROJECT OWNER / EDITOR
export const addPlayerConfig = async (req, res) => {
  try {
    const { projectID, params, name, desc } = req.body;
    const owner = req.session.username;

    // Check if Project exists & Authorized
    const project = await Project.findOne({ status: "active", projectID });

    switch (true) {
      case !project:
        return res.status(404).json({ message: "Project not found" });
      case !project.owners.includes(owner) && !project.editors.includes(owner):
        return res.status(403).json({ message: "Unauthorized" });
    }

    // Check if PlayerConfig already exists
    const playerConfig = await PlayerConfig.findOne({
      status: "active",
      projectID,
      params,
    });
    if (playerConfig) {
      return res.status(409).json({
        message: "PlayerConfig already exists",
        playerConfigId: playerConfig.configID,
      });
    }

    // Create new PlayerConfig
    const newPlayerConfig = new PlayerConfig({
      configID: generateID(`PC_${project.name}`),
      projectID,
      companyID: project.companyID,
      name,
      desc,
      params,
    });
    await newPlayerConfig.save();

    res
      .status(201)
      .json({ message: "Success", playerConfigId: newPlayerConfig.configID });
  } catch (error) {
    if (error.details) {
      return res
        .status(400)
        .json(error.details.map((detail) => detail.message).join(", "));
    }

    return res.status(500).send(error.message);
  }
};

// DELETE APP / PLAYER CONFIG - PROJECT OWNER / EDITOR
export const deleteConfig = async (req, res) => {
  try {
    const { configID } = req.query;
    const user = req.session.username;

    if (configID.startsWith("ac")) {
      const appConfig = await AppConfig.findOne({ status: "active", configID });

      if (!appConfig) {
        return res.status(404).json({ message: "AppConfig not found" });
      }

      const project = await Project.findOne(
        { projectID: appConfig.projectID },
        { owners: 1, editors: 1, _id: 0 }
      );

      if (!project.owners.includes(user) && !project.editors.includes(user)) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      appConfig.status = "inactive";
      await appConfig.save();
    }

    if (configID.startsWith("pc")) {
      const playerConfig = await PlayerConfig.findOne({
        status: "active",
        configID,
      });

      if (!playerConfig) {
        return res.status(404).json({ message: "PlayerConfig not found" });
      }

      const project = await Project.findOne(
        { projectID: playerConfig.projectID },
        { owners: 1, editors: 1, _id: 0 }
      );

      if (!project.owners.includes(user) && !project.editors.includes(user)) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      playerConfig.status = "inactive";
      await playerConfig.save();
    }

    res.status(200).json({ message: "Success" });
  } catch (error) {
    res.status(500).send(error.message);
  }
};

// MODIFY APP / PLAYER CONFIG - PROJECT OWNER / EDITOR
export const modifyConfig = async (req, res) => {
  try {
    const { configID, params, name, desc } = req.body;
    const user = req.session.username;

    if (configID.startsWith("ac")) {
      const appConfig = await AppConfig.findOne({ status: "active", configID });

      if (!appConfig) {
        return res.status(404).json({ message: "AppConfig not found" });
      }

      const project = await Project.findOne(
        { projectID: appConfig.projectID },
        { owners: 1, editors: 1, _id: 0 }
      );

      if (!project.owners.includes(user) && !project.editors.includes(user)) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      appConfig.params = params || appConfig.params;
      appConfig.name = name || appConfig.name;
      appConfig.desc = desc || appConfig.desc;
      await appConfig.save();
    }

    if (configID.startsWith("pc")) {
      const playerConfig = await PlayerConfig.findOne({
        status: "active",
        configID,
      });

      if (!playerConfig) {
        return res.status(404).json({ message: "PlayerConfig not found" });
      }

      const project = await Project.findOne(
        { projectID: playerConfig.projectID },
        { owners: 1, editors: 1, _id: 0 }
      );

      if (!project.owners.includes(user) && !project.editors.includes(user)) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      playerConfig.params = params || playerConfig.params;
      playerConfig.name = name || playerConfig.name;
      playerConfig.desc = desc || playerConfig.desc;
      await playerConfig.save();
    }

    return res.status(200).json({ message: "Success" });
  } catch (error) {
    return res.status(500).send(error.message);
  }
};

// CLONE CONFIG - PROJECT OWNER / EDITOR
export const cloneConfig = async (req, res) => {
  try {
    const { configID, name, desc, params } = req.body;
    const user = req.session.username;

    if (configID.startsWith("ac")) {
      const appConfig = await AppConfig.findOne({ status: "active", configID });

      if (!appConfig) {
        return res.status(404).json({ message: "AppConfig not found" });
      }

      const project = await Project.findOne(
        { projectID: appConfig.projectID },
        { owners: 1, editors: 1, _id: 0 }
      );

      if (!project.owners.includes(user) && !project.editors.includes(user)) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const newAppConfig = new AppConfig({
        configID: generateID(`AC_${project.name}`),
        projectID: appConfig.projectID,
        companyID: appConfig.companyID,
        desc: desc || appConfig.desc,
        name: name || appConfig.name,
        params: params || appConfig.params,
      });
      await newAppConfig.save();
    }

    if (configID.startsWith("pc")) {
      const playerConfig = await PlayerConfig.findOne({
        status: "active",
        configID,
      });

      if (!playerConfig) {
        return res.status(404).json({ message: "PlayerConfig not found" });
      }

      const project = await Project.findOne(
        { projectID: playerConfig.projectID },
        { owners: 1, editors: 1, _id: 0 }
      );

      if (!project.owners.includes(user) && !project.editors.includes(user)) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const newPlayerConfig = new PlayerConfig({
        configID: generateID(`PC_${project.name}`),
        projectID: playerConfig.projectID,
        companyID: playerConfig.companyID,
        desc: desc || playerConfig.desc,
        name: name || playerConfig.name,
        params: params || playerConfig.params,
      });
      await newPlayerConfig.save();
    }

    return res.status(200).json({ message: "Success" });
  } catch (error) {
    console.log(error.message)
    return res.status(500).send(error.message);
  }
};

// GET ALL APP CONFIGS - PROJECT OWNER / EDITOR / VIEWER
export const getAllAppConfigs = async (req, res) => {
  try {
    const { projectID } = req.query;
    const user = req.session.username;

    // Check if Project exists & Authorized
    const project = await Project.findOne(
      { status: "active", projectID },
      { owners: 1, editors: 1, viewers: 1, _id: 0 }
    );

    switch (true) {
      case !project:
        return res.status(404).json({ message: "Project not found" });
      case !project.owners.includes(user) &&
        !project.editors.includes(user) &&
        !project.viewers.includes(user):
        return res.status(403).json({ message: "Unauthorized" });
    }

    const result = await AppConfig.find(
      { status: "active", projectID },
      { _id: 0, __v: 0 }
    );

    res.status(200).json(result);
  } catch (error) {
    return res.status(500).send(error.message);
  }
};

// GET ALL PLAYER CONFIGS - PROJECT OWNER / EDITOR / VIEWER
export const getAllPlayerConfigs = async (req, res) => {
  try {
    const { projectID } = req.query;
    const user = req.session.username;

    // Check if Project exists & Authorized
    const project = await Project.findOne(
      { status: "active", projectID },
      { owners: 1, editors: 1, viewers: 1, _id: 0 }
    );

    switch (true) {
      case !project:
        return res.status(404).json({ message: "Project not found" });
      case !project.owners.includes(user) &&
        !project.editors.includes(user) &&
        !project.viewers.includes(user):
        return res.status(403).json({ message: "Unauthorized" });
    }

    const result = await PlayerConfig.find(
      { status: "active", projectID },
      { _id: 0, __v: 0 }
    );

    res.status(200).json(result);
  } catch (error) {
    return res.status(500).send(error.message);
  }
};

// MAP CONFIGS TO FILTER IN MASTER - PROJECT OWNER / EDITOR
export const createMapping = async (req, res) => {
  try {
    const { companyID, projectID, appConfig, playerConfig, filter } = req.body;
    const owner = req.session.username;

    // Check if Project exists & Authorized
    const project = await Project.findOne({ status: "active", projectID });

    switch (true) {
      case !project:
        return res.status(404).json({ message: "Project not found" });
      case !project.owners.includes(owner) && !project.editors.includes(owner):
        return res.status(403).json({ message: "Unauthorized" });
    }

    // Check if AppConfig & PlayerConfig exists
    const appConfigDoc = await AppConfig.findOne({
      status: "active",
      configID: appConfig.configID,
    });
    const playerConfigDoc = await PlayerConfig.findOne({
      status: "active",
      configID: playerConfig.configID,
    });

    switch (true) {
      case !appConfigDoc:
        return res.status(404).json({ message: "AppConfig not found" });
      case !playerConfigDoc:
        return res.status(404).json({ message: "PlayerConfig not found" });
    }

    // const mergedFilter = {};

    // project.filters.map((filter) => {
    //   mergedFilter[filter.name] = {
    //     priority: filter.priority,
    //     value: "",
    //   };
    // });

    // Object.keys(filter).map((key) => {
    //   mergedFilter[key].value = filter[key];
    // });

    let priority = 0;
    let filterCount = 0;

    project.filters.map((item) => {
      Object.keys(filter).map((key) => {
        if (item.name === key && filter[key] !== "ALL") {
          priority += item.priority;
          filterCount += 1;
        }
      });
    });

    const filterDetails = {
      priority,
      filterCount,
    };

    const document = await Master.findOneAndUpdate(
      {
        projectID,
        filter,
      },
      {
        companyID,
        projectID,
        appConfig,
        playerConfig,
        filter,
        filterDetails,
        status: "active",
      },
      { upsert: true, new: true }
    );

    res.status(201).json({ message: "Success", document });
  } catch (error) {
    console.log(error.message);
    return res.status(500).send(error.message);
  }
};

// DELETE MAPPING FROM MASTER - PROJECT OWNER / EDITOR
export const deleteMapping = async (req, res) => {
  try {
    const { projectID, filter } = req.body;
    const owner = req.session.username;

    // Check if Project exists & Authorized
    const project = await Project.findOne({ status: "active", projectID });

    switch (true) {
      case !project:
        return res.status(404).json({ message: "Project not found" });
      case !project.owners.includes(owner) && !project.editors.includes(owner):
        return res.status(403).json({ message: "Unauthorized" });
    }

    const masterDoc = await Master.findOneAndUpdate(
      {
        projectID,
        filter,
        status: "active",
      },
      {
        status: "inactive",
      }
    );

    if (!masterDoc) {
      return res.status(404).json({ message: "Mapping not found" });
    }

    res.status(200).json({ message: "Success" });
  } catch (error) {
    return res.status(500).send(error);
  }
};


// GET MAPPING FROM FILTER PARAMS
export const getActiveMapping = async (req, res) => {
  try {
    const { projectID, filter } = req.body;

    switch (true) {
      case !projectID:
        return res.status(400).json({ message: "ProjectID is required" });
      case !filter:
        return res.status(400).json({ message: "Filter is required" });
    }

    const master = await Master.findOne({
      projectID,
      status: "active",
      filter,
    }, {
      _id: 0,
      __v: 0,
      status: 0,
      createdAt: 0,
      updatedAt: 0,
    });

    if(!master) {
      return res.status(200).json({ code: "NO_MAPPING" ,message: "Mapping not found",
        mappings: {
          appConfig: {},
          playerConfig: {},
          filter: {},
        }
       });
    }

    res.status(200).json({ code: "FOUND", message: "Success", mappings: master });
  } catch (error) {
    console.log(error.message)
    return res.status(500).send(error.message);
  }
};

// GET MAPPING FROM FILTER PARAMS
export const getMappingScale = async (req, res) => {
  try {
    const { projectID, filter } = req.body;

    switch (true) {
      case !projectID:
        return res.status(400).json({ message: "ProjectID is required" });
      case !filter:
        return res.status(400).json({ message: "Filter is required" });
    }

    const masters = await Master.findOne({
      projectID,
      status: "active",
      filter,
    }, {
      _id: 0,
      __v: 0,
      status: 0,
      createdAt: 0,
      updatedAt: 0,
    });

    if (!masters) {
      return res.status(200).json({ code: "NO_MAPPING" ,message: "Mapping not found",
        mappings: {
          appConfig: {},
          playerConfig: {},
          filter: {},
        }
       });
    }

    const appConfig = masters.appConfig?.params || {};
    const playerConfig = masters.playerConfig?.params || {};

    const resObj = {
      appConfig,
      playerConfig,
      filter: masters.filter,
      projectID: masters.projectID,
      companyID: masters.companyID
    };

    res.status(200).json({ code: "FOUND", message: "Success", mappings: resObj });
  } catch (error) {
    console.log(error.message)
    return res.status(500).send(error.message);
  }
};