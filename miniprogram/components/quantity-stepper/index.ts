Component({
  properties: { quantity: { type: Number, value: 0 } },
  methods: {
    decrease() {
      if (this.data.quantity <= 0) return;
      this.triggerEvent("change", { delta: -1 });
    },
    increase() { this.triggerEvent("change", { delta: 1 }); },
  },
});
