

## Problem

When the user advances a stage ("Avançar Etapa") from inside the `PedidoDetailsSheet` overlay, the sheet automatically closes (line 213 in `PedidoDetailsSheet.tsx`: `onOpenChange(false)`), sending the user back to the Pedidos list. The user expects to stay viewing the order details with the updated stage.

## Fix

**File: `src/components/pedidos/PedidoDetailsSheet.tsx`**

In the `handleMoverProximaEtapa` function (line ~212-213), remove `onOpenChange(false)` so the sheet stays open after advancing a stage. The `onUpdate()` call will refresh the data and the user will see the updated stage without losing context.

The same applies to `handleMarcarConcluido` (line ~244-245) — optionally keep the sheet open there too, or at least show a brief success state before closing.

**Changes:**
1. Remove `onOpenChange(false)` from `handleMoverProximaEtapa` (keep only `onUpdate()`)
2. Optionally remove `onOpenChange(false)` from `handleMarcarConcluido` as well (or keep it since the order is fully done)

This is a one-line fix that prevents the sheet from closing when advancing stages.

