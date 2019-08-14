/**
 * @copyright Copyright (c) 2019 Maxim Khorin <maksimovichu@gmail.com>
 */
'use strict';

const STATUS_ACTIVE = 'active';
const STATUS_BLOCKED = 'blocked';

const Base = require('areto/db/ActiveRecord');

module.exports = class User extends Base {

    static getConstants () {
        return {
            TABLE: 'sys_user',
            ATTRS: [
                'name', 
                'email',
                'status',
                'verified',
                'unlockAt',
                'createdAt',
                'updatedAt',
                'authKey',
                'passwordHash'
            ],
            BEHAVIORS: {
                'timestamp': require('areto/behavior/TimestampBehavior')
            },
            RULES: [
                ['status', 'default', {value: 'active'}],
                [['name', 'email', 'status'], 'required'],
                ['name', 'regexp', {pattern: /^[а-яa-z0-9\s-]+$/i}],
                ['email', 'email'],
                ['password', 'required', {on: 'create'}],
                ['password', 'string'],
                ['verified', 'checkbox'],
                ['unlockAt', 'date'],
                [['name', 'email'], 'unique', {skipOnAnyError: true, ignoreCase: true}]
            ],
            ATTR_VALUE_LABELS: {
                'status': {
                    [STATUS_ACTIVE]: 'Active',
                    [STATUS_BLOCKED]: 'Blocked',
                }
            },
            STATUS_ACTIVE,
            STATUS_BLOCKED,
            AUTH_KEY_LENGTH: 16
        };
    }

    isActive () {
        return this.get('status') === STATUS_ACTIVE;
    }

    isBlocked () {
        return this.get('status') === STATUS_BLOCKED;
    }

    isVerified () {
        return this.get('verified');
    }

    getTitle () {
        return this.get('name');
    }

    findIdentity (id) {
        return this.findById(id).and({status: STATUS_ACTIVE});
    }

    findByEmail (email) {
        return this.find({email});
    }

    findSame (name, email) {
        return this.find().andFilter({name}).orFilter({email});
    }

    async getAssignments () {
        if (!this.assignments) {
            this.assignments = await this.module.get('rbac').getUserAssignments(this.getId());
        }
        return this.assignments;        
    }

    toJSON () {
        return this.getTitle();
    }

    // EVENTS

    async beforeSave (insert) {
        await super.beforeSave(insert);
        this.setPasswordHash();
        if (insert) {
            this.setAuthKey();
        }
    }
   
    // PASSWORD

    checkPassword (password) {
        return SecurityHelper.checkPassword(password, this.get('passwordHash'));
    }

    setPasswordHash () {
        if (this.get('password')) {
            this.set('passwordHash', SecurityHelper.hashPassword(this.get('password')));
        }
    }

    // AUTH KEY

    getAuthKey () {
        return this.get('authKey');
    }

    setAuthKey () {
        this.set('authKey', SecurityHelper.getRandomString(this.AUTH_KEY_LENGTH));
    }

    checkAuthKey (key) {
        return this.getAuthKey() === key;
    }
};
module.exports.init(module);

const SecurityHelper = require('areto/helper/SecurityHelper');