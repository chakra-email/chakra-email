import { Column, Heading, Row, Table, TableBody, Text } from 'chakra-email';
import { EmailShell } from './email-shell.js';

export interface ReceiptItem {
  name: string;
  price: string;
}

export interface ReceiptEmailProps {
  items: ReceiptItem[];
  orderNumber: string;
  productName: string;
  total: string;
}

export const previewProps = {
  items: [
    { name: 'Team plan', price: '$24.00' },
    { name: 'Usage add-on', price: '$6.00' },
  ],
  orderNumber: 'A-1042',
  productName: 'Acme',
  total: '$30.00',
} satisfies ReceiptEmailProps;

export default function ReceiptEmail({
  items,
  orderNumber,
  productName,
  total,
}: ReceiptEmailProps) {
  return (
    <EmailShell
      productName={productName}
      preview={`Receipt for order ${orderNumber}.`}
    >
      <Heading as="h1" color="fg" fontSize="2xl" mb={2}>
        Payment received
      </Heading>
      <Text color="fg.muted" mt={0} mb={6}>
        Order {orderNumber}
      </Text>
      <Table m={0}>
        <TableBody>
          {items.map((item) => (
            <Row key={`${item.name}-${item.price}`}>
              <Column py={3} borderBottom="1px solid" borderColor="border">
                <Text color="fg" m={0}>
                  {item.name}
                </Text>
              </Column>
              <Column
                py={3}
                borderBottom="1px solid"
                borderColor="border"
                align="right"
              >
                <Text color="fg" m={0}>
                  {item.price}
                </Text>
              </Column>
            </Row>
          ))}
          <Row>
            <Column pt={5}>
              <Text color="fg" fontWeight="bold" m={0}>
                Total
              </Text>
            </Column>
            <Column pt={5} align="right">
              <Text color="fg" fontWeight="bold" m={0}>
                {total}
              </Text>
            </Column>
          </Row>
        </TableBody>
      </Table>
    </EmailShell>
  );
}
