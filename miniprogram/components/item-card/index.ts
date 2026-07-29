Component({
  properties: { item: { type: Object, value: {} } },
  methods: {
    open() { this.triggerEvent("open", { itemId: this.data.item.id }); },
    onQuantityChange(event: WechatMiniprogram.CustomEvent<{ delta: number }>) {
      this.triggerEvent("quantitychange", {
        itemId: this.data.item.id,
        delta: event.detail.delta,
      });
    },
    process() { this.triggerEvent("process", { itemId: this.data.item.id }); },
  },
});
