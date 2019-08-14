/**
 * @copyright Copyright (c) 2019 Maxim Khorin <maksimovichu@gmail.com>
 */
'use strict';

const Base = require('areto/base/Behavior');

module.exports = class OverriddenValueBehavior extends Base {

    constructor (config) {
        super({
            // originAttr:
            // attrs: []
            // originValueMethod: Function
            stateAttr: 'overriddenState',
            attrPrefix: 'override-',
            ...config
        });
        this.setHandler(ActiveRecord.EVENT_BEFORE_INSERT, this.beforeSave);
        this.setHandler(ActiveRecord.EVENT_BEFORE_UPDATE, this.beforeSave);
    }

    hasOrigin () {
        return !!this.owner.get(this.originAttr);
    }

    get (attrName) {
        return this.owner.get(this.getStates()[attrName] ? attrName : `${this.originAttr}.${attrName}`);
    }

    getStates () { // overridden states
        return this.owner.get(this.stateAttr) || {};
    }

    setStates (data) {
        this.owner.set(this.stateAttr, data);
    }

    async getAttrMap () {
        const map = {};
        const states = this.getStates();
        const origin = this.owner.rel(this.originAttr);
        const namePrefix = `${this.owner.constructor.name}[${this.stateAttr}]`;
        for (const name of this.attrs) {
            map[name] = {
                attr: this.attrPrefix + name,
                name: `${namePrefix}[${name}]`,
                overridden: states[name]
            };
            map[name].inheritValue = await this.getOriginValue(name, origin);
        }
        return map;
    }

    async beforeSave () {
        this.owner.set(this.stateAttr, this.filterStates(this.getStates()));
        const origin = await this.owner.findRelation(this.originAttr);
        return this.setStateOriginValues(origin);
    }

    filterStates (states = {}) {
        for (const name of Object.keys(states)) {
            states[name] = !!states[name];
        }
        return states;
    }

    async setStateOriginValues (origin) {
        const states = this.getStates();
        for (const name of Object.keys(states)) {
            if (!states[name]) {
                this.owner.set(name, await this.getOriginValue(name, origin));
            }    
        }        
    }

    getOriginValue (attrName, origin) {
        return this.originValueMethod
            ? this.originValueMethod(attrName, origin, this)
            : origin.get(attrName);
    }

    getUpdatedAttrNames () {
        const states = this.getStates();
        const names = [];
        for (const name of this.attrs) {
            if (states[name]) {
                names.push(name);
            }
        }
        return names;
    }

    getInheritedAttrNames () {
        const states = this.getStates();
        const names = [];
        for (const name of this.attrs) {
            if (!states[name]) {
                names.push(name);
            }
        }
        return names;
    }

    async setInheritedValues (origin) {
        const states = this.getStates();
        for (const name of this.attrs) {
            if (!states[name]) {
                this.owner.set(name, await this.getOriginValue(name, origin));
            }
        }
    }

    setStatesByData (data) {
        const states = {};
        for (const name of this.attrs) {
            states[name] = data.hasOwnProperty(name);
        }
        this.setStates(states);
    }
};

const ActiveRecord = require('areto/db/ActiveRecord');