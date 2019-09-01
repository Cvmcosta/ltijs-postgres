"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

var _classPrivateFieldGet2 = _interopRequireDefault(require("@babel/runtime/helpers/classPrivateFieldGet"));

var _classPrivateFieldSet2 = _interopRequireDefault(require("@babel/runtime/helpers/classPrivateFieldSet"));

const crypto = require('crypto');

const Sequelize = require('sequelize');
/**
 * @description Collection of methods to manipulate the database.
 */


class Database {
  constructor(database) {
    _sequelize.set(this, {
      writable: true,
      value: void 0
    });

    _Models.set(this, {
      writable: true,
      value: void 0
    });

    _ExpireTime.set(this, {
      writable: true,
      value: {
        idtoken: 3600 * 24,
        contexttoken: 3600 * 24,
        accesstoken: 3600,
        nonce: 10
        /**
         * @description Mongodb configuration setup
         * @param {Object} database - Configuration object
         */

      }
    });

    (0, _classPrivateFieldSet2.default)(this, _sequelize, new Sequelize('cvm', 'postgres', '123456', {
      host: 'localhost',
      dialect: 'postgres',
      logging: false
    }));
  }
  /**
   * @description Opens connection to database
   */


  async setup() {
    await (0, _classPrivateFieldGet2.default)(this, _sequelize).authenticate();
    (0, _classPrivateFieldSet2.default)(this, _Models, {
      idtoken: (0, _classPrivateFieldGet2.default)(this, _sequelize).define('idtoken', {
        iss: {
          type: Sequelize.STRING,
          primaryKey: true
        },
        issuer_code: {
          type: Sequelize.STRING
        },
        user: {
          type: Sequelize.STRING
        },
        roles: {
          type: Sequelize.ARRAY(Sequelize.STRING)
        },
        userInfo: {
          type: Sequelize.JSONB
        },
        platformInfo: {
          type: Sequelize.JSONB
        },
        endpoint: {
          type: Sequelize.JSONB
        },
        namesRoles: {
          type: Sequelize.JSONB
        }
      }),
      contexttoken: (0, _classPrivateFieldGet2.default)(this, _sequelize).define('contexttoken', {
        path: {
          type: Sequelize.STRING,
          primaryKey: true
        },
        user: {
          type: Sequelize.STRING
        },
        context: {
          type: Sequelize.JSONB
        },
        resource: {
          type: Sequelize.JSONB
        },
        custom: {
          type: Sequelize.JSONB
        }
      }),
      platform: (0, _classPrivateFieldGet2.default)(this, _sequelize).define('platform', {
        platformName: {
          type: Sequelize.STRING
        },
        platformUrl: {
          type: Sequelize.STRING,
          primaryKey: true
        },
        clientId: {
          type: Sequelize.STRING
        },
        authEndpoint: {
          type: Sequelize.STRING
        },
        accesstokenEndpoint: {
          type: Sequelize.STRING
        },
        kid: {
          type: Sequelize.STRING
        },
        authConfig: {
          type: Sequelize.JSONB
        }
      }),
      publickey: (0, _classPrivateFieldGet2.default)(this, _sequelize).define('publickey', {
        kid: {
          type: Sequelize.STRING,
          primaryKey: true
        },
        iv: {
          type: Sequelize.STRING
        },
        data: {
          type: Sequelize.STRING(10000)
        }
      }),
      privatekey: (0, _classPrivateFieldGet2.default)(this, _sequelize).define('privatekey', {
        kid: {
          type: Sequelize.STRING,
          primaryKey: true
        },
        iv: {
          type: Sequelize.STRING
        },
        data: {
          type: Sequelize.STRING(10000)
        }
      }),
      accesstoken: (0, _classPrivateFieldGet2.default)(this, _sequelize).define('accesstoken', {
        platformUrl: {
          type: Sequelize.STRING,
          primaryKey: true
        },
        iv: {
          type: Sequelize.STRING
        },
        data: {
          type: Sequelize.STRING
        }
      }),
      nonce: (0, _classPrivateFieldGet2.default)(this, _sequelize).define('nonce', {
        nonce: {
          type: Sequelize.STRING,
          primaryKey: true
        }
      }) // Sync models to database, creating tables if they do not exist

    });
    await (0, _classPrivateFieldGet2.default)(this, _sequelize).sync(); // Adding Nonce deletion rule to database

    await (0, _classPrivateFieldGet2.default)(this, _sequelize).query('CREATE OR REPLACE RULE "DeleteOldNonce" AS ON INSERT TO public.nonces DO DELETE FROM nonces WHERE (nonces."createdAt" + \'00:00:10\'::interval) < CURRENT_TIMESTAMP;');
    await (0, _classPrivateFieldGet2.default)(this, _sequelize).query('CREATE OR REPLACE RULE "DeleteOldIdToken" AS ON INSERT TO public.idtokens DO DELETE FROM idtokens WHERE (idtokens."createdAt" + \'1 day\'::interval) < CURRENT_TIMESTAMP;');
    await (0, _classPrivateFieldGet2.default)(this, _sequelize).query('CREATE OR REPLACE RULE "DeleteOldContextToken" AS ON INSERT TO public.contexttokens DO DELETE FROM contexttokens WHERE (contexttokens."createdAt" + \'1 day\'::interval) < CURRENT_TIMESTAMP;');
    await (0, _classPrivateFieldGet2.default)(this, _sequelize).query('CREATE OR REPLACE RULE "DeleteOldAccessToken" AS ON INSERT TO public.accesstokens DO DELETE FROM accesstokens WHERE (accesstokens."createdAt" + \'01:00:00\'::interval) < CURRENT_TIMESTAMP;');
    return true;
  }
  /**
     * @description Get item or entire database.
     * @param {String} ENCRYPTIONKEY - Encryptionkey of the database, false if none
     * @param {String} table - The name of the table from where to query
     * @param {Object} [info] - Info for the item being searched for in the format {col1: "value1"}.
     */


  async Get(ENCRYPTIONKEY, table, info) {
    if (!table) throw new Error('Missing pool or table argument.');
    const result = await (0, _classPrivateFieldGet2.default)(this, _Models)[table].findAll({
      where: info,
      raw: true
    }); // Decrypt if encrypted

    for (const i in result) {
      const temp = result[i];

      if (temp.createdAt) {
        const createdAt = Date.parse(temp.createdAt);
        const elapsedTime = (Date.now() - createdAt) / 1000;

        if ((table === 'accesstoken' || table === 'idtoken' || table === 'contexttoken' || table === 'nonce') && elapsedTime >= (0, _classPrivateFieldGet2.default)(this, _ExpireTime)[table]) {
          this.Delete(table, info);
          result.splice(i, 1);
          continue;
        }

        result[i].createdAt = createdAt;
      }

      if (temp.updatedAt) {
        const updatedAt = Date.parse(temp.updatedAt);
        result[i].updatedAt = updatedAt;
      }

      if (ENCRYPTIONKEY) result[i] = JSON.parse((await this.Decrypt(result[i].data, result[i].iv, ENCRYPTIONKEY)));
    } // Check if query was successful


    if (result.length === 0) return false;
    return result;
  }
  /**
     * @description Insert item in database.
     * @param {String} ENCRYPTIONKEY - Encryptionkey of the database, false if none.
     * @param {String} table - The name of the table from where to query
     * @param {Object} item - The item Object you want to insert in the database.
     * @param {Object} [index] - Key that should be used as index in case of Encrypted document.
     */


  async Insert(ENCRYPTIONKEY, table, item, index) {
    if (!table || !item || ENCRYPTIONKEY && !index) throw new Error('Missing argument.');

    try {
      // Encrypt if encryption key is present
      let newDocData = item;

      if (ENCRYPTIONKEY) {
        const encrypted = await this.Encrypt(JSON.stringify(item), ENCRYPTIONKEY);
        newDocData = {
          [Object.keys(index)[0]]: Object.values(index)[0],
          iv: encrypted.iv,
          data: encrypted.data
        };
      }

      await (0, _classPrivateFieldGet2.default)(this, _Models)[table].create(newDocData);
      return true;
    } catch (err) {
      console.log(err);
      return false;
    }
  }
  /**
     * @description Assign value to item in database
     * @param {String} ENCRYPTIONKEY - Encryptionkey of the database, false if none.
     * @param {String} table - The name of the table from where to query
     * @param {Object} info - Info for the item being modified in the format {col1: "value1"}.
     * @param {Object} modification - The modification you want to make in the format {col1: "value2"}.
     */


  async Modify(ENCRYPTIONKEY, table, info, modification) {
    // Parameter check
    if (!table || !info || !modification) throw new Error('Missing argument.'); // Encrypt if encryption key is present

    let newMod = modification;

    if (ENCRYPTIONKEY) {
      let result = await (0, _classPrivateFieldGet2.default)(this, _Models)[table].findOne({
        where: info,
        raw: true
      });

      if (result) {
        result = JSON.parse((await this.Decrypt(result.data, result.iv, ENCRYPTIONKEY)));
        result[Object.keys(modification)[0]] = Object.values(modification)[0];
        newMod = await this.Encrypt(JSON.stringify(result), ENCRYPTIONKEY);
      }
    }

    await (0, _classPrivateFieldGet2.default)(this, _Models)[table].update(newMod, {
      where: info
    });
    return true;
  }
  /**
     * @description Delete item in database
     * @param {String} table - The name of the table from where to query
     * @param {Object} [info] - Info for the item being deleted in the format {col1: "value1"}.
     */


  async Delete(table, info) {
    // Parameter check
    if (!table || !info) throw new Error('Missing argument.');
    await (0, _classPrivateFieldGet2.default)(this, _Models)[table].destroy({
      where: info
    });
    return true;
  }
  /**
   * @description Encrypts data.
   * @param {String} data - Data to be encrypted
   * @param {String} secret - Secret used in the encryption
   */


  async Encrypt(data, secret) {
    const hash = crypto.createHash('sha256');
    hash.update(secret);
    const key = hash.digest().slice(0, 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(data);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return {
      iv: iv.toString('hex'),
      data: encrypted.toString('hex')
    };
  }
  /**
   * @description Decrypts data.
   * @param {String} data - Data to be decrypted
   * @param {String} _iv - Encryption iv
   * @param {String} secret - Secret used in the encryption
   */


  async Decrypt(data, _iv, secret) {
    const hash = crypto.createHash('sha256');
    hash.update(secret);
    const key = hash.digest().slice(0, 32);
    const iv = Buffer.from(_iv, 'hex');
    const encryptedText = Buffer.from(data, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  }

  async Close() {
    await (0, _classPrivateFieldGet2.default)(this, _sequelize).close();
    return true;
  }

}

var _sequelize = new WeakMap();

var _Models = new WeakMap();

var _ExpireTime = new WeakMap();

module.exports = Database;