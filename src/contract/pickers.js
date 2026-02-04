import flatpickr from "flatpickr"
import "flatpickr/dist/themes/dark.css"
import { normalizeIso } from "./utils"

export function syncEndMinDate({ endPicker, form }) {
  if (!endPicker) return
  endPicker.set("minDate", form.timeline.start || null)
  if (form.timeline.end && form.timeline.end < form.timeline.start) {
    form.timeline.end = form.timeline.start
    endPicker.setDate(form.timeline.end)
  }
}

export function initPickers({
  startInput,
  endInput,
  form,
  setStartPicker,
  setEndPicker,
  onStartChange,
  onEndChange,
}) {
  const startPicker = flatpickr(startInput.value, {
    dateFormat: "Y-m-d",
    altInput: true,
    altFormat: "M d, Y",
    minDate: "today",
    onChange: (d) => {
      form.timeline.start = normalizeIso(d[0])
      onStartChange?.()
    },
  })

  const endPicker = flatpickr(endInput.value, {
    dateFormat: "Y-m-d",
    altInput: true,
    altFormat: "M d, Y",
    onChange: (d) => {
      form.timeline.end = normalizeIso(d[0])
      onEndChange?.()
    },
  })

  setStartPicker(startPicker)
  setEndPicker(endPicker)
}

export function destroyPickers(startPicker, endPicker) {
  startPicker?.destroy()
  endPicker?.destroy()
}
