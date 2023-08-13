use super::GlobalContext;
use ckb_standalone_types::bytes::Bytes;

pub fn blake2b_256<T: AsRef<[u8]>>(s: T) -> [u8; 32] {
    let mut result = [0u8; 32];
    let mut hasher = blake2b_ref::Blake2bBuilder::new(32)
        .personal(b"ckb-default-hash")
        .build();
    hasher.update(s.as_ref());
    hasher.finalize(&mut result);
    result
}

pub fn decode_hex(mut s: &str) -> Result<Bytes, String> {
    if s.starts_with("0x") {
        s = &s[2..];
    }
    hex::decode(s)
        .map(Bytes::from)
        .map_err(|e| format!("Error parsing hex content: {}", e))
}

pub fn save_to_slot_widget(ui: &mut egui::Ui, slot: &Option<u64>) -> bool {
    let mut clicked = false;
    match slot {
        Some(slot) => {
            ui.label(
                egui::RichText::new(format!("Saved to slot {}", slot)).color(egui::Color32::YELLOW),
            );
        }
        None => {
            clicked = ui
                .button("💾")
                .on_hover_text("Click to save to new slot")
                .clicked();
        }
    };
    clicked
}

pub fn restore_from_slot_widget(
    ui: &mut egui::Ui,
    multiline: bool,
    manual_edit_value: &mut String,
    slot: &mut Option<u64>,
    global_context: &mut GlobalContext,
) -> bool {
    let slot_content = match slot {
        Some(slot_id) => match global_context.fetch_slot(*slot_id) {
            Some(value) => Some((*slot_id, value)),
            None => {
                // A slot is available but the actual value is missing, this
                // could be due to the fact that a window gets removed.
                *slot = None;
                None
            }
        },
        None => None,
    };
    let mut changed = false;
    match slot_content {
        Some((slot_id, value)) => {
            if manual_edit_value != &value {
                *manual_edit_value = value.clone();
                changed = true;
            }
            ui.horizontal(|ui| {
                if ui
                    .button("💰")
                    .on_hover_text("Using slot value, click to manually edit the value")
                    .clicked()
                {
                    *slot = None;
                }
                let available_slots = global_context.available_slots();
                // Previous match has asserted that slot_id exists in available slots
                let mut selected_index =
                    available_slots.iter().position(|s| *s == slot_id).unwrap();
                ui.vertical_centered(|ui| {
                    if egui::ComboBox::from_label("Select a slot")
                        .show_index(ui, &mut selected_index, available_slots.len(), |i| {
                            format!("Slot {}", available_slots[i])
                        })
                        .changed()
                    {
                        *slot = Some(available_slots[selected_index]);
                        *manual_edit_value = global_context
                            .fetch_slot(available_slots[selected_index])
                            .unwrap();
                        changed = true;
                    }
                    ui.add(egui::Label::new(value).wrap(true));
                });
            });
        }
        None => {
            ui.horizontal(|ui| {
                let slots = global_context.available_slots();
                if (!slots.is_empty())
                    && ui
                        .button("🔄")
                        .on_hover_text("Click to load from slots")
                        .clicked()
                {
                    *slot = Some(slots[0]);
                }
                if (if multiline {
                    ui.text_edit_multiline(manual_edit_value)
                } else {
                    ui.text_edit_singleline(manual_edit_value)
                })
                .changed()
                {
                    changed = true;
                }
            });
        }
    };
    changed
}
