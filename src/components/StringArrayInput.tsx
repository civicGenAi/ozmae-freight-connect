import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface StringArrayInputProps {
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  maxItems?: number;
}

export function StringArrayInput({ values = [], onChange, placeholder = "Add item...", maxItems = 5 }: StringArrayInputProps) {
  const [inputValue, setInputValue] = useState("");

  const handleAdd = () => {
    if (inputValue.trim() && values.length < maxItems) {
      onChange([...values, inputValue.trim()]);
      setInputValue("");
    }
  };

  const handleRemove = (index: number) => {
    const newValues = [...values];
    newValues.splice(index, 1);
    onChange(newValues);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <div className="space-y-2">
      {values.map((val, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <Input value={val} readOnly className="bg-muted/50 h-9" />
          <Button 
            type="button" 
            variant="outline" 
            size="icon" 
            className="h-9 w-9 shrink-0 text-rose-500 hover:text-rose-600 hover:bg-rose-50 border-rose-200"
            onClick={() => handleRemove(idx)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}
      
      {values.length < maxItems && (
        <div className="flex items-center gap-2">
          <Input 
            value={inputValue} 
            onChange={(e) => setInputValue(e.target.value)} 
            onKeyDown={handleKeyDown}
            placeholder={placeholder} 
            className="h-9"
          />
          <Button 
            type="button" 
            variant="secondary" 
            className="h-9 shrink-0 border border-slate-200" 
            onClick={handleAdd}
            disabled={!inputValue.trim()}
          >
            <Plus className="h-4 w-4 mr-1" /> Add
          </Button>
        </div>
      )}
      <p className="text-[10px] text-muted-foreground text-right">{values.length} / {maxItems} max</p>
    </div>
  );
}
