Component({
  properties: {
    currentHousehold: { type: Object, value: {} },
  },
  methods: {
    openHouseholdPicker() {
      wx.navigateTo({ url: "/pages/households/index" });
    },
  },
});
