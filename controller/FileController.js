/**
 * @copyright Copyright (c) 2019 Maxim Khorin <maksimovichu@gmail.com>
 */
'use strict';

const Base = require('../component/base/BaseController');

module.exports = class FileController extends Base {

    static getConstants () {
        return {
           BEHAVIORS: {
                'access': {
                    Class: require('areto/filter/AccessControl'),
                    rules: [{
                        actions: ['upload', 'delete'],
                        permissions: ['upload']
                    }]
                }
            },
            METHODS: {
                'upload': 'post',
                'delete': 'post'
            }
        };
    }

    async actionUpload () {
        const model = this.spawn('model/RawFile', {user: this.user});
        if (!await model.upload(this.req, this.res)) {
            return this.sendText(this.translate(model.getFirstError()), 400);
        }
        this.sendJson({
            id: model.getId(),
            size: model.get('size')
        });
    }

    async actionDelete () {
        const query = this.spawn('model/RawFile').findById(this.getPostParam('id'));
        const model = await query.and({owner: null}).one();
        if (model) {
            await model.delete();
        }
        this.sendStatus(200);
    }

    async actionDownload () {
        const model = await this.getModel();
        const file = model.getPath();
        const stat = await FileHelper.getStat(file);
        if (!stat) {
            model.log('error', 'File not found');
            return this.sendStatus(404);
        }
        this.setHttpHeader(model.getFileHeaders());
        this.sendFile(file);
    }

    async actionPreview () {
        const model = await this.getModel();
        const file = await model.ensurePreview(this.getQueryParam('s'));
        if (!file) {
            return this.sendStatus(404);
        }
        this.setHttpHeader(model.getPreviewHeaders());
        this.sendFile(file);
    }
};
module.exports.init(module);

const FileHelper = require('areto/helper/FileHelper');