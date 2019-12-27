/*********************************************************************************************************************
 *  Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.                                           *
 *                                                                                                                    *
 *  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance    *
 *  with the License. A copy of the License is located at                                                             *
 *                                                                                                                    *
 *      http://www.apache.org/licenses/LICENSE-2.0                                                                    *
 *                                                                                                                    *
 *  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES *
 *  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions    *
 *  and limitations under the License.                                                                                *
 *********************************************************************************************************************/

/**
 * @author Solution Builders
 */

'use strict';

/**
 * Lib
 */
const Logger = require('logger');
const Auth = require('authorizer');
const Status = require('./status.js');
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const awsServerlessExpressMiddleware = require('aws-serverless-express/middleware');
const app = express();
const router = express.Router();

// declare a new express app
router.use(cors());
router.use((req, res, next) => {
  bodyParser.json()(req, res, err => {
    if (err) {
      return res.status(400).json({
        code: 400,
        error: 'BadRequest',
        message: err.message
      });
    }
    next();
  });
});
router.use(bodyParser.urlencoded({extended: true}));
router.use(awsServerlessExpressMiddleware.eventContext());

const claimTicketHandler = async (req, res, next) => {
  try {
    const ticket = await Auth.getUserClaimTicket(req.header('Authorization'));
    req.ticket = ticket;
    next();
  } catch (err) {
    return res
      .status(401)
      .json({error: 'AccessDeniedException', message: err.message});
  }
};

const getStatus = async (req, res) => {
  const {ticket} = req;
  const {deviceId} = req.params;
  let _status = new Status();
  Logger.log(
    Logger.levels.INFO,
    `Attempting retrieve device status for device ${deviceId}`
  );

  try {
    const result = await _status.getDeviceStatus(ticket, deviceId);
    res.json(result);
  } catch (err) {
    Logger.log(Logger.levels.INFO, err);

    let status = err.code;
    return res.status(status).json(err);
  }
};

/****************************
 * Status methods *
 ****************************/

router.get('/devices/:deviceId/status', claimTicketHandler, getStatus);

app.use('/', router);

// Export the app object. When executing the application local this does nothing. However,
// to port it to AWS Lambda we will create a wrapper around that will load the app from
// this file
module.exports = app;
