import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bookmark, BookmarkPlus, ChevronDown, Loader2, LogIn, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  CalculatorKey,
  SavedCalculation,
  useSavedCalculations,
} from "@/hooks/useSavedCalculations";

interface Props<TInputs, TSnapshot> {
  calculator: CalculatorKey;
  /** Current form values to capture when the user hits Save. */
  currentInputs: TInputs;
  /** Small result summary (1-3 fields) shown next to each saved entry. */
  currentSnapshot: TSnapshot;
  /** Render a one-line summary for a saved entry (e.g. "Debt-free in 3y 4m · $4,538 interest"). */
  formatSummary: (entry: SavedCalculation<TInputs, TSnapshot>) => string;
  /** Apply a saved scenario back into the calculator's form. */
  onLoad: (entry: SavedCalculation<TInputs, TSnapshot>) => void;
}

export function SavedScenarios<TInputs, TSnapshot>({
  calculator,
  currentInputs,
  currentSnapshot,
  formatSummary,
  onLoad,
}: Props<TInputs, TSnapshot>) {
  const navigate = useNavigate();
  const { items, loading, requiresAuth, save, remove } =
    useSavedCalculations<TInputs, TSnapshot>(calculator);
  const [open, setOpen] = useState(true);
  const [saveOpen, setSaveOpen] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const result = await save(name, currentInputs, currentSnapshot);
    setSaving(false);
    if (result) {
      setName("");
      setSaveOpen(false);
    }
  };

  if (requiresAuth) {
    return (
      <section className="glass-card mt-6 animate-fade-up rounded-3xl p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/15">
            <Bookmark className="h-5 w-5 text-primary" strokeWidth={1.5} />
          </div>
          <div className="flex-1">
            <h2 className="font-display text-base text-foreground">Save your scenarios</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Sign in to keep your numbers across devices and come back to them anytime.
            </p>
            <Button
              size="sm"
              variant="outline"
              className="mt-3 gap-2"
              onClick={() => navigate("/auth")}
            >
              <LogIn className="h-4 w-4" />
              Sign in
            </Button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="glass-card mt-6 animate-fade-up rounded-3xl p-5">
      <Collapsible open={open} onOpenChange={setOpen}>
        <div className="flex items-center justify-between gap-3">
          <CollapsibleTrigger className="flex flex-1 items-center gap-3 text-left">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/15">
              <Bookmark className="h-5 w-5 text-primary" strokeWidth={1.5} />
            </div>
            <div>
              <h2 className="font-display text-base text-foreground">Saved scenarios</h2>
              <p className="text-xs text-muted-foreground">
                {items.length === 0
                  ? "Nothing saved yet."
                  : `${items.length} scenario${items.length === 1 ? "" : "s"} in your library`}
              </p>
            </div>
            <ChevronDown
              className={`ml-auto h-4 w-4 text-muted-foreground transition-transform ${
                open ? "rotate-180" : ""
              }`}
            />
          </CollapsibleTrigger>

          <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5">
                <BookmarkPlus className="h-4 w-4" />
                Save
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle className="font-display text-lg">Save this scenario</DialogTitle>
                <DialogDescription>
                  Give it a name you'll recognize — e.g. "Family debts" or "Aggressive plan".
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2">
                <Label htmlFor="scenario-name">Name</Label>
                <Input
                  id="scenario-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="My scenario"
                  maxLength={80}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && name.trim() && !saving) handleSave();
                  }}
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setSaveOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={!name.trim() || saving} className="gap-1.5">
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  Save
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <CollapsibleContent>
          {loading ? (
            <div className="mt-4 flex items-center justify-center py-6 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : items.length === 0 ? (
            <p className="mt-4 rounded-2xl border border-dashed border-border/40 bg-muted/10 p-4 text-center text-xs text-muted-foreground">
              Tweak your numbers above, then tap <strong>Save</strong> to keep this scenario for
              later.
            </p>
          ) : (
            <ul className="mt-4 space-y-2">
              {items.map((entry) => (
                <li
                  key={entry.id}
                  className="flex items-center gap-2 rounded-2xl border border-border/40 bg-background/30 p-3 transition-colors hover:bg-muted/15"
                >
                  <button
                    onClick={() => onLoad(entry)}
                    className="flex-1 text-left"
                    aria-label={`Load ${entry.name}`}
                  >
                    <p className="truncate font-display text-sm text-foreground">{entry.name}</p>
                    <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                      {formatSummary(entry)}
                    </p>
                  </button>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                        aria-label={`Delete ${entry.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete "{entry.name}"?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This scenario will be permanently removed from your library.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => remove(entry.id)}>
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </li>
              ))}
            </ul>
          )}
        </CollapsibleContent>
      </Collapsible>
    </section>
  );
}
