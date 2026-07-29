Component({
  properties: { quantity: { type: Number, value: 0 } },
  methods: {
    decrease() { this.triggerEvent("change", { delta: -1 }); },
    increase() { this.triggerEvent("change", { delta: 1 }); },
  },
});
