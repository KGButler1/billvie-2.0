import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

interface DetailsAccordionProps {
  label?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

const DetailsAccordion = ({ label = 'Add more details', defaultOpen = false, children }: DetailsAccordionProps) => (
  <Accordion type="single" collapsible defaultValue={defaultOpen ? 'details' : undefined}>
    <AccordionItem value="details" className="border-none">
      <AccordionTrigger className="text-sm font-medium text-muted-foreground hover:no-underline hover:text-foreground py-2">
        {label}
      </AccordionTrigger>
      <AccordionContent>
        <div className="space-y-4 pt-1">{children}</div>
      </AccordionContent>
    </AccordionItem>
  </Accordion>
);

export default DetailsAccordion;
