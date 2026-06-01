import type { Item } from "@/content/schema";
import { useSessionStore } from "@/store/session";
import MultipleChoice from "./MultipleChoice";
import MultipleSelect from "./MultipleSelect";
import TwoPartEBSR from "./TwoPartEBSR";
import EvidenceSelect from "./EvidenceSelect";
import OrderItem from "./OrderItem";
import InlineDropdown from "./InlineDropdown";
import ShortResponse from "./ShortResponse";
import ProseResponse from "./ProseResponse";

interface Props {
  item: Item;
  itemNumber: number;
  totalItems: number;
}

export default function ItemPanel({ item, itemNumber, totalItems }: Props) {
  const flagged = useSessionStore(
    (s) => !!s.state?.flags[item.id],
  );

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6 max-w-3xl mx-auto">
        <div className="text-xs text-muted font-ui mb-2">
          Item {itemNumber} of {totalItems}
          {flagged && (
            <span className="ml-2 text-accent">⚑ Flagged for review</span>
          )}
          <span className="ml-2">· {prettyType(item.type)}</span>
        </div>
        {renderItem(item)}
      </div>
    </div>
  );
}

function prettyType(t: Item["type"]) {
  switch (t) {
    case "multiple_choice": return "Multiple choice";
    case "multiple_select": return "Select all that apply";
    case "two_part_ebsr": return "Two-part question";
    case "evidence_select": return "Click the evidence";
    case "order": return "Put in order";
    case "inline_dropdown": return "Fill in";
    case "short_response": return "Short response";
    case "prose_response": return "Written response";
  }
}

function renderItem(item: Item) {
  switch (item.type) {
    case "multiple_choice": return <MultipleChoice item={item} />;
    case "multiple_select": return <MultipleSelect item={item} />;
    case "two_part_ebsr": return <TwoPartEBSR item={item} />;
    case "evidence_select": return <EvidenceSelect item={item} />;
    case "order": return <OrderItem item={item} />;
    case "inline_dropdown": return <InlineDropdown item={item} />;
    case "short_response": return <ShortResponse item={item} />;
    case "prose_response": return <ProseResponse item={item} />;
  }
}
