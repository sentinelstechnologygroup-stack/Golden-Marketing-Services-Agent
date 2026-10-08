import React from 'react';
import {Label} from '@/components/ui/label';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
export default function QualField({ q, value, onChange }) {
  if (q.field_type === 'yes_no') {
    return (
      <div>
        <Label className="text-xs">{q.label}{q.required && ' *'}</Label>
        <div className="flex gap-2 mt-1">
          <Button type="button" size="sm" variant={value === 'yes' ? 'default' : 'outline'} onClick={() => onChange('yes')}>Yes</Button>
          <Button type="button" size="sm" variant={value === 'no' ? 'default' : 'outline'} onClick={() => onChange('no')}>No</Button>
        </div>
      </div>
    );
  }
  if (q.field_type === 'multiple_choice') {
    return (
      <div>
        <Label className="text-xs">{q.label}{q.required && ' *'}</Label>
        <select className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm mt-1" value={value || ''} onChange={e => onChange(e.target.value)}>
          <option value="">Select...</option>
          {(q.options || []).map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>
    );
  }
  if (q.field_type === 'numeric' || q.field_type === 'budget') {
    return <div><Label className="text-xs">{q.label}{q.required && ' *'}</Label><Input type="number" className="mt-1" value={value || ''} onChange={e => onChange(e.target.value)} /></div>;
  }
  if (q.field_type === 'date_time') {
    return <div><Label className="text-xs">{q.label}{q.required && ' *'}</Label><Input type="datetime-local" className="mt-1" value={value || ''} onChange={e => onChange(e.target.value)} /></div>;
  }
  return <div><Label className="text-xs">{q.label}{q.required && ' *'}</Label><Input className="mt-1" value={value || ''} onChange={e => onChange(e.target.value)} /></div>;
}
