/**
 * @copyright Copyright (c) 2019 Maxim Khorin <maksimovichu@gmail.com>
 */
'use strict';

Jam.Tabs = class extends Jam.Element {

    constructor ($container) {
        super($container);
        this.$container = $container;
        this.event = new Jam.Event(this.constructor.name);
        this.init();
    }

    init () {
        this.$container.on('click', '.nav-tabs a', this.onClickTab.bind(this));
        this.$container.on('click', '.tab-close', this.onClickTabClose.bind(this));
    }

    isActive (id) {
        return this.getActiveId() === id;
    }

    getActiveId () {
        return this.getNavs().filter('.active').data('id');
    }

    getActiveNav () {
        return this.getNavs().filter('.active');
    }

    getNav (id) {
        return this.getNavs().filter(`[data-id=${id}]`);
    }

    getNavByElement (element) {
        return $(element).closest('.nav-tab');
    }

    getNavs () {
        return this.$container.children('.nav').children();
    }

    getActivePane () {
        return this.getPanes().filter('.active');
    }

    getPane (id) {
        return this.getPanes().filter(`[data-id=${id}]`);
    }

    getPanes () {
        return this.$container.children('.tab-content').children();
    }

    setActiveFirst () {
        this.setActive(this.getNavs().first().data('id'));
    }

    setActive (id) {
        if (this.getActiveId() !== id) {
            this.unsetActive();
            this.getNav(id).addClass('active');
            Jam.createElements(this.getPane(id).addClass('active'));
            this.event.trigger('change', {id});
        }
    }

    unsetActive () {
        this.getActiveNav().removeClass('active');
        this.getActivePane().removeClass('active');
    }

    onClickTab (event) {
        event.preventDefault();
        this.setActive(this.getNavByElement(event.currentTarget).data('id'));
    }

    onClickTabClose (event) {
        event.preventDefault();
        let id = this.getNavByElement(event.currentTarget).data('id');
        let data = {id, close: true};
        this.event.trigger('close', data);
        if (data.close) {
            this.removeTab(id);
            this.setActiveFirst();
        }
    }

    appendTab () {
        this.createTab('append', ...arguments);
    }

    prependTab (id) {
        this.createTab('prepend', ...arguments);
    }

    createTab (method, id, data = {}) {
        if (this.getNav(id).length) {
            return true;
        }
        let text = data.text || id;
        let hint = data.hint || text;
        let close = data.close ? 'closing' : '';
        let content = data.content;
        this.getNavs().parent()[method](`<li class="nav-tab ${close}" data-id="${id}"><a href="#" title="${hint}">${text}</a><div class="tab-close">×</div></li>`);
        this.getPanes().parent()[method](`<div class="tab-pane" data-id="${id}">${content}</div>`);
        this.event.trigger('create', {id});
    }
    
    removeTab (id) {
        this.getNav(id).remove();
        this.getPane(id).remove();
        this.event.trigger('remove', {id});
    }
};