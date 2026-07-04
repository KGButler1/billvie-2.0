import { useState } from 'react';
import { ArrowLeft, MoreVertical, Edit2, Check, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Event, EventStatus, EVENT_TYPE_LABELS } from '@/types/bill';
import { EventService } from '@/services/EventService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';

interface EventHeaderProps {
  event: Event;
  onUpdate: () => void;
}

const statusColors: Record<EventStatus, string> = {
  planning: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  active: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  completed: 'bg-green-500/10 text-green-500 border-green-500/20',
  archived: 'bg-muted text-muted-foreground border-muted',
};

const EventHeader = ({ event, onUpdate }: EventHeaderProps) => {
  const navigate = useNavigate();
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(event.name);

  const handleSaveName = () => {
    if (editedName.trim() && editedName !== event.name) {
      EventService.updateEvent(event.id, { name: editedName.trim() });
      onUpdate();
    }
    setIsEditingName(false);
  };

  const handleStatusChange = (status: EventStatus) => {
    if (status === 'archived') {
      // Could show confirmation dialog here
      EventService.updateEvent(event.id, { status });
    } else {
      EventService.updateEvent(event.id, { status });
    }
    onUpdate();
  };

  const handleDelete = () => {
    if (confirm('Delete this event? This cannot be undone.')) {
      EventService.deleteEvent(event.id);
      navigate('/events');
    }
  };

  const dateRange = event.startDate && event.endDate
    ? `${format(parseISO(event.startDate), 'MMM d')} - ${format(parseISO(event.endDate), 'MMM d, yyyy')}`
    : event.startDate
    ? format(parseISO(event.startDate), 'MMM d, yyyy')
    : null;

  return (
    <header className="fixed top-0 left-0 right-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border lg:hidden">
      <div className="container mx-auto px-4">
        <div className="h-16 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/events')}
            className="shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>

          <div className="flex-1 min-w-0">
            {isEditingName ? (
              <div className="flex items-center gap-2">
                <Input
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  className="h-8 text-lg font-semibold"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveName();
                    if (e.key === 'Escape') setIsEditingName(false);
                  }}
                />
                <Button size="icon" variant="ghost" onClick={handleSaveName}>
                  <Check className="w-4 h-4 text-green-500" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => setIsEditingName(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold truncate">{event.name}</h1>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 shrink-0"
                  onClick={() => setIsEditingName(true)}
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{EVENT_TYPE_LABELS[event.type]}</span>
              {dateRange && <span>• {dateRange}</span>}
            </div>
          </div>

          {/* Status Badge/Dropdown */}
          <Select value={event.status} onValueChange={handleStatusChange}>
            <SelectTrigger className={cn(
              'w-auto h-8 border text-xs font-medium',
              statusColors[event.status]
            )}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="planning">Planning</SelectItem>
              <SelectItem value="active">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>

          {/* Actions Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setIsEditingName(true)}>
                Edit Event
              </DropdownMenuItem>
              <DropdownMenuItem disabled className="text-muted-foreground">
                Share Event (Paid)
              </DropdownMenuItem>
              <DropdownMenuItem disabled className="text-muted-foreground">
                Duplicate as Template (Paid)
              </DropdownMenuItem>
              <DropdownMenuItem disabled className="text-muted-foreground">
                Export Summary (Paid)
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={handleDelete}
                className="text-destructive focus:text-destructive"
              >
                Delete Event
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

export default EventHeader;
