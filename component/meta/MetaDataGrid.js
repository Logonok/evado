/**
 * @copyright Copyright (c) 2019 Maxim Khorin <maksimovichu@gmail.com>
 */
'use strict';

const Base = require('../misc/DataGrid');

module.exports = class MetaDataGrid extends Base {

    constructor (config) {
        super({
            // query: new Query
            // controller: this,
            metaData: config.controller.metaData,
            view: config.controller.getView(),
            ...config
        });
    }

    async getList () {
        this._result = {};
        await this.metaData.security.access.filterObjects(this.query);
        this._result.maxSize = await this.query.count();
        this.setOffset();
        this.setLimit();
        this.setOrder();
        this.setCommonSearch();
        await this.resolveFilter();
        this._result.totalSize = await this.query.count();
        await this.setModels();
        await this.metaData.security.resolveListForbiddenAttrs(this._models, this.metaData.view);
        this._result.items = await this.filterByColumns(this._models);
        return this._result;
    }

    async setModels () {
        let links = this.request.changes && this.request.changes.links;
        if (Array.isArray(links) && links.length) {
            this._models = await this.query.and(['NOT ID', this.query.view.getKey(), links]).all();
            links = await this.query.where(['ID', this.query.view.getKey(), links]).offset(0).all();
            this._models = links.concat(this._models);
        } else {
            this._models = await this.query.all();
        }
    }

    setOrder () {
        const order = this.request.order;
        if (!order) {
            return false;
        }
        for (let name of Object.keys(order)) {
            let attr = this.metaData.view.getAttr(name);
            if (attr ? !attr.isSortable() : (name !== this.metaData.class.getKey())) {
                throw new BadRequest(`Not sortable attribute: ${name}`);
            }
            if (order[name] !== 1 && order[name] !== -1) {
                throw new BadRequest(`Invalid order: ${name}`);
            }
        }
        if (Object.values(order).length) {
            this.query.order(order);
        }
    }

    setCommonSearch () {
        let value = this.request.search;
        if (typeof value !== 'string' || !value.length) {
            return false;
        }
        let conditions = [];
        for (let attr of this.metaData.view.commonSearchAttrs) {
            let condition = attr.getSearchCondition(value);
            if (condition) {
                conditions.push(condition);
            }
        }
        if (!this.metaData.view.commonSearchAttrs.includes(this.metaData.class.getKey())) {
            let condition = this.metaData.class.key.getCondition(value);
            if (condition) {
                conditions.push(condition);
            }
        }
        conditions.length
            ? this.query.andJoinByOr(conditions)
            : this.query.where(['FALSE']);
    }

    async resolveFilter () {
        if (!Array.isArray(this.request.filter)) {
            return null;
        }
        this.query.and(await (new ListFilterCondition({
            view: this.metaData.view,
            items: this.request.filter,
            query: this.query,
            ...this.filter
        })).resolve());
    }

    filterByColumns (models) {
        if (!models.length) {
            return [];
        }
        this._attrTemplateMap = this.getAttrTemplateMap(models[0].view);
        this._readForbiddenAttrs = this.metaData.security.getForbiddenAttrs(Rbac.READ);
        return PromiseHelper.map(models, this.renderModel, this);
    }

    getAttrTemplateMap (view) {
        let map = {};
        for (let attr of view.attrs) {
            map[attr.name] = this.view.getMetaItemTemplate(attr);
        }
        return map;
    }

    async renderModel (model) {
        let result = {
            //[model.class.CLASS_ATTR]: model.get(model.class.CLASS_ATTR)
        };
        await PromiseHelper.setImmediate();
        for (let attr of model.view.attrs) {
            await this.renderCell(attr, model, result);
        }
        if (!model.view.hasKeyAttr()) {
            result[model.view.getKey()] = model.getId();
        }
        return result;
    }

    async renderCell (attr, model, result) {
        let name = attr.name;
        if (this.isReadForbiddenAttr(name, model)) {
            return result[name] = this.metaData.security.noAccessMessage;
        }
        if (!this._attrTemplateMap[name]) {
            return result[name] = this.renderAttr(name, attr, model);
        }
        let content = await this.view.render(this._attrTemplateMap[name], {attr, model});
        result[name] = `<!--handler: ${name}-->${content}`;
    }

    isReadForbiddenAttr (name, model) {
        return this._readForbiddenAttrs && this._readForbiddenAttrs.includes(name)
            || model.readForbiddenAttrs && model.readForbiddenAttrs.includes(name);
    }

    renderAttr (name, attr, model) {
        if (name === this.ROW_KEY) {
            return model.getId();
        }
        let value = model.semantic.get(name);
        if (value instanceof Date) {
            return this.renderDateAttr(value, attr);
        }
        if (value && attr.isFile()) {
            return this.renderFileAttr(value, attr, model);
        }
        if (Array.isArray(value)) {
            return value.join('<br>');
        }
        /*
        if (value instanceof Model) {  // value.getTitle === function
            return value.getTitle();
        }
        */
        return this.controller.format(value, attr.getFormat());
    }

    renderDateAttr (value, attr) {
        return this.controller.format(value, 'clientDate', {
            utc: attr.isUTC(),
            format: attr.getFormat()
        });
    }

    renderFileAttr (value, attr, model) {
        let data = this.getFileAttrData(attr, model);
        let name = data.Behavior.getName(model);
        if (data.preview && data.Behavior.isImage(model)) {
            return this.controller.format(data.preview + model.getId(), 'preview', {
                download: data.download + model.getId(),
                text: name
            });
        }
        return this.controller.format(data.download + model.getId(), 'download', {text});
    }

    getFileAttrData (attr, model) {
        if (!this._fileAttrData) {
            let Behavior = model.class.FileBehaviorConfig.Class;
            this._fileAttrData = Behavior.getViewData(attr, model.view, this.controller.module.NAME);
            this._fileAttrData.Behavior = Behavior;
        }
        return this._fileAttrData;
    }
};

const BadRequest = require('areto/error/BadRequestHttpException');
const PromiseHelper = require('areto/helper/PromiseHelper');
const ListFilterCondition = require('./MetaListFilterCondition');
const Rbac = require('../rbac/Rbac');