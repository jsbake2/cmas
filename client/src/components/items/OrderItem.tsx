import { useMemo } from "react";
import type { Item } from "@/content/schema";
import { useSessionStore } from "@/store/session";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface Props {
  item: Extract<Item, { type: "order" }>;
}

export default function OrderItem({ item }: Props) {
  const session = useSessionStore();
  const stored = session.state?.responses[item.id] as string[] | undefined;
  const order = useMemo(() => {
    if (stored && stored.length === item.elements.length) return stored;
    return item.elements.map((e) => e.id);
  }, [stored, item.elements]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = order.indexOf(active.id as string);
    const newIdx = order.indexOf(over.id as string);
    if (oldIdx < 0 || newIdx < 0) return;
    session.setResponse(item.id, arrayMove(order, oldIdx, newIdx));
  }

  return (
    <div>
      <h3 className="font-ui text-lg mb-3">{item.stem}</h3>
      <p className="text-sm text-muted mb-4">
        Drag the steps into the correct order. Use the up/down arrow keys after
        focusing a step for keyboard reordering.
      </p>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={order} strategy={verticalListSortingStrategy}>
          <ol className="space-y-2">
            {order.map((id, idx) => {
              const el = item.elements.find((e) => e.id === id);
              if (!el) return null;
              return <SortableRow key={id} id={id} idx={idx} text={el.text} />;
            })}
          </ol>
        </SortableContext>
      </DndContext>
    </div>
  );
}

function SortableRow({
  id,
  idx,
  text,
}: {
  id: string;
  idx: number;
  text: string;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });
  return (
    <li
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.6 : 1,
      }}
      className="card flex items-center gap-3"
      {...attributes}
      {...listeners}
    >
      <span
        className="text-muted text-sm font-ui w-6 text-center"
        aria-hidden="true"
      >
        ⋮⋮
      </span>
      <span className="text-sm text-muted font-ui">{idx + 1}.</span>
      <span className="flex-1">{text}</span>
    </li>
  );
}
