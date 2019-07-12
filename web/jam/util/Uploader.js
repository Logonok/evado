/**
 * @copyright Copyright (c) 2019 Maxim Khorin <maksimovichu@gmail.com>
 */
'use strict';

// EVENTS

// uploader:error
// uploader:selected - select new files
// uploader:overflow - select too many files
// uploader:finished - all files uploaded

// uploader:file:appended - new uploader item cloned
// uploader:file:validated - item validated
// uploader:file:started - start upload
// uploader:file:progress - progress upload - percents
// uploader:file:uploaded - file uploaded
// uploader:file:confirmRemove - remove file after user confirm
// uploader:file:removed - remove file

Jam.Uploader = class {

    static create ($uploader) {
        return $uploader.data('uploader') || new Jam.Uploader($uploader);
    }

    static getDefaultOptions () {
        return {
            maxFiles: 1,
            minSize: 1,
            maxSize: null,
            extensions: null,
            mimeTypes: null,
            tooSmall: 'File size cannot be smaller than {limit} B',
            tooBig: 'File size cannot exceed {limit} B',
            wrongExtension: 'Only these extensions are allowed: {extensions}',
            wrongMimeType: 'Only these MIME types are allowed: {mimeTypes}',
            imageOnly: false,
            maxHeight: null,
            maxWidth: null,
            minHeight: 1,
            minWidth: 1,
            notImage: 'The file is not an image',
            overHeight: 'The height cannot be larger than {limit} px',
            overWidth: 'The width cannot be larger than {limit} px',
            underHeight: 'The height cannot be smaller than {limit} px',
            underWidth: 'The width cannot be smaller than {limit} px',
            tooMany: 'Too many files',
            alreadyExists: 'This file has already been selected',
            confirmRemoveStatus: ['done', 'uploading'],
            attrName: 'file',
            upload: 'file/upload',
            remove: 'file/remove'
        };
    }

    constructor ($uploader) {
        this.$uploader = $uploader;
        this.$uploader.data('uploader', this);
        this.options = {
            ...Jam.Uploader.getDefaultOptions(),
            ...$uploader.data('options')
        };
        this.files = [];
        this.$input = $uploader.find('[type="file"]');
        this.init();
    }

    init () {
        this.initDropZone();
        if (this.options.mimeTypes) {
            this.$input.attr('accept', this.options.mimeTypes.join());
        }
        if (this.options.maxFiles > 1) {
            this.$input.attr('multiple', true);
        }
        this.$input.change(event => {
            this.setFiles(event.target.files);
        });
    }

    initDropZone () {
        this.$dropzone = this.$uploader.find(".uploader-dropzone");
        let dropzone = this.$dropzone.get(0);
        dropzone.ondragover = this.onDragOver.bind(this);
        dropzone.ondragleave = this.onDragLeave.bind(this);
        dropzone.ondrop = this.onDrop.bind(this);
        dropzone.onclick = this.onClickDropZone.bind(this);
        this.hideDropZone(0);
    }

    on (eventName, handler, data) {
        this.$uploader.on(`uploader:${eventName}`, handler, data);
    }

    trigger (eventName, data) {
        this.$uploader.trigger(`uploader:${eventName}`, data);
    }

    onDragOver (event) {
        //$dropZone.addClass('drag');
        return false;
    }

    onDragLeave (event) {
        //$dropZone.removeClass('drag');
        return false;
    }

    onDrop (event) {
        event.preventDefault();
        this.setFiles(event.dataTransfer.files);
        return false;
    }

    onClickDropZone (event) {
        this.$input.click();
    }

    isProcessing () {
        for (let file of this.files) {
            if (file.isProcessing()) {
                return true;
            }
        }
    }

    abort () {
        for (let file of this.files) {
            file.abort();
        }
    }

    setFiles (files) {
        let counter = this.count();
        counter.total += files.length;
        if (counter.total > Number(this.options.maxFiles)) {
            return this.trigger('overflow', this.options.tooMany);
        }
        if (files.length) {
            for (let i = 0; i < files.length; ++i) { // 'of' not work
                this.files.push(new Jam.Uploader.File(files[i], this));
            }
            this.hideDropZone(counter.total);
            this.$input.wrap('<form>').closest('form').get(0).reset();
            this.$input.unwrap();
            this.trigger('selected', counter);
            this.processNext();
        }
    }

    hideDropZone (total) {
        if (Number(total) >= Number(this.options.maxFiles)) {
            this.toggleDropZone(false);
        }
    }

    toggleDropZone (state) {
        this.$uploader.toggleClass('show-dropzone', state);
    }

    count () {
        let counter = {
            total: 0,
            failed: 0,
            done: 0
        };
        for (let file of this.files) {
            if (!file.removed) {
                if (file.failed) {
                    ++counter.failed;
                } else if (file.isDone()) {
                    ++counter.done;
                }
                ++counter.total;
            }
        }
        return counter;
    }

    processNext () {
        setTimeout(()=> {
            let map = this.getFirstFilesByStatus();
            let UFile = Jam.Uploader.File;
            if (map.hasOwnProperty('pending')) {
                map['pending'].append();
            } else if (map.hasOwnProperty('appended')) {
                map['appended'].validate();
            } else if (map.hasOwnProperty('validated')
                && !map.hasOwnProperty('uploading')) {
                map['validated'].upload();
            }
        }, 100);
    }

    getFirstFilesByStatus () {
        let map = {};
        for (let file of this.files) {
            if (!file.removed && !file.failed && !map.hasOwnProperty(file.status)) {
                map[file.status] = file;
            }
        }
        return map;
    }

    setSavedFile (data) {
        let counter = this.count();
        this.hideDropZone(counter.total + 1);
        let file = new Jam.Uploader.File(data, this);
        file.setSaved();
        this.files.push(file);
    }
};

Jam.Uploader.File = class {

    constructor (file, uploader) {
        this.failed = false;
        this.removed = false;
        this.status = 'pending';
        this.file = file;
        this.uploader = uploader;
    }

    trigger (eventName) {
        this.uploader.trigger(`file:${eventName}`, this);
    }

    isDone () {
        return this.status === 'done';
    }

    isProcessing () {
        return !this.removed && !this.failed && !this.isDone();
    }

    setSaved () {
        this.status = 'done';
        this.info = this.file;
        this.buildItem();
        this.trigger('appended');
        this.trigger('saved');
    }

    setError (error) {
        this.failed = true;
        this.error = error;
        this.trigger('error');
    }

    abort () {
        if (this.xhr) {
            this.xhr.abort();
        }
    }

    remove (error) {
        this.removed = true;
        if (this.$item) {
            this.$item.remove();
        }
        this.abort();
        this.uploader.toggleDropZone(true);
        this.trigger('remove');
    }

    // APPEND

    buildItem () {
        this.$item = this.uploader.$uploader.find('.sample').clone().removeClass('sample').show();
        this.uploader.$uploader.find('.uploader-list').prepend(this.$item);
        this.$item.data('file', this).find('.uploader-remove').click(this.onRemoveFile.bind(this));
    }

    onRemoveFile () {
        this.failed || this.uploader.options.confirmRemoveStatus.indexOf(this.status) === -1
            ? this.remove()
            : this.trigger('confirmRemove');
    }

    append () {
        this.buildItem();
        this.status = 'appended';
        this.trigger('appended');
        this.uploader.processNext();
    }

    // VALIDATE

    validate () {
        // SKIP VALIDATION
        /*this.status = 'validated';
         this.trigger('validated');
         this.uploader.processNext();
         return; //*/

        // пытаемся загрузить файл как изображение, и по результату начинаем валидацию
        // загрузка изображения происходит по событиям, а не последовательно
        this.image = new Image;
        this.image.onload = event => {
            this.startValidate();
        };
        this.image.onerror = event => {
            this.image = null;
            this.startValidate();
        };
        this.image.src = window.URL.createObjectURL(this.file);
    }

    startValidate () {
        let error = this.validateFile();
        this.status = 'validated';
        this.trigger('validated');
        error && this.setError(error);
        this.uploader.processNext();
    }

    validateFile () {
        let options = this.uploader.options;
        let file = this.file;
        if (this.isMatchFile()) {
            return options.alreadyExists;
        }
        if (options.extensions) {
            let index = file.name.lastIndexOf('.');
            let ext = index > - 1 ? file.name.substr(index + 1, file.name.length).toLowerCase() : '';
            if (options.extensions.indexOf(ext) === -1) {
                return options.wrongExtension.replace(/\{extensions\}/g, options.extensions.join(', '));
            }
        }
        if (options.mimeTypes && options.mimeTypes.indexOf(file.type) === -1) {
            return options.wrongMimeType.replace(/\{mimeTypes\}/g, options.mimeTypes.join(', '));
        }
        if (options.maxSize && options.maxSize < file.size) {
            return options.tooBig.replace(/\{limit\}/g, options.maxSize);
        }
        if (options.minSize && options.minSize > file.size) {
            return options.tooSmall.replace(/\{limit\}/g, options.minSize);
        }
        if (options.imageOnly) {
            return this.image ? this.validateImage() : options.notImage;
        }
        if (this.image) {
            return this.validateImage();
        }
        if (options.imageOnly) {
            return options.notImage;
        }
        return false;
    }

    isMatchFile () {
        let files = this.uploader.files;
        for (let i = 0; i < files.length; ++i) { // 'of' not work
            let file = files[i];
            if (!file.removed) {
                // проверять на совпадение только с предыдущими файлами
                if (file === this) {
                    return false;
                }
                if (file.file.size === this.file.size && file.file.name === this.file.name) {
                    return true;
                }
            }
        }
        return false;
    }

    validateImage () {
        let options = this.uploader.options;
        if (options.maxHeight && options.maxHeight < this.image.height) {
            return options.overHeight.replace(/\{limit\}/g, options.maxHeight);
        }
        if (options.maxWidth && options.maxWidth < this.image.width) {
            return options.overWidth.replace(/\{limit\}/g, options.maxWidth);
        }
        if (options.minHeight && options.minHeight > this.image.height) {
            return options.underHeight.replace(/\{limit\}/g, options.minHeight);
        }
        if (options.minWidth && options.minWidth > this.image.width) {
            return options.underWidth.replace(/\{limit\}/g, options.minWidth);
        }
        return false;
    }

    // UPLOAD

    upload () {
        this.xhr = new XMLHttpRequest;
        this.xhr.open('POST', this.uploader.options.upload);
        if (this.xhr.upload) {
            this.xhr.upload.addEventListener('progress', event => {
                this.progressUploading(event);
            }, false);
        }
        this.xhr.onreadystatechange = event => {
            this.changeReadyState(event);
        };
        // создать данные формы для выгрузки на сервер
        let data = new FormData;
        data.append(this.uploader.options.attrName, this.file.name);
        data.append(this.uploader.options.attrName, this.file);
        this.status = 'uploading';
        this.trigger('started');
        this.xhr.send(data);
    }

    progressUploading (event) {
        // can be FALSE if server never sent Content-Length header in the response
        if (event.lengthComputable) {
            this.percent = Math.round(event.loaded * 100 / event.total);
            this.trigger('progress');
        }
    }

    changeReadyState (event) {
        if (this.xhr.readyState === 4) {
            if (this.xhr.status === 200) {
                this.status = 'done';
                this.info = this.xhr.response;
                this.trigger('uploaded');
            } else {
                this.setError(this.xhr.response);
            }
            this.uploader.processNext();
        }
    }
};