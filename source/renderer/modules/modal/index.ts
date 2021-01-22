// Modal container

import Vue from 'vue'
import Modal from './modal.vue'
import Vuex from 'vuex'

Vue.use(Vuex)

export default (store: any): Vue => {
  return new Vue({
    ...Modal,
    el: '#modal',
    store: store
  })
}
