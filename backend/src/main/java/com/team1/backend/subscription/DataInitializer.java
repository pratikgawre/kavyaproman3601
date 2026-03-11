package com.team1.backend.subscription;

import com.team1.backend.subscription.model.Invoice;
import com.team1.backend.subscription.model.Plan;
import com.team1.backend.subscription.model.Subscription;
import com.team1.backend.subscription.repository.InvoiceRepository;
import com.team1.backend.subscription.repository.PlanRepository;
import com.team1.backend.subscription.repository.SubscriptionRepository;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import java.time.LocalDate;

@Component
@Profile("dev")
public class DataInitializer implements ApplicationRunner {

    private final PlanRepository planRepository;
    private final InvoiceRepository invoiceRepository;
    private final SubscriptionRepository subscriptionRepository;

    public DataInitializer(PlanRepository planRepository, InvoiceRepository invoiceRepository, SubscriptionRepository subscriptionRepository) {
        this.planRepository = planRepository;
        this.invoiceRepository = invoiceRepository;
        this.subscriptionRepository = subscriptionRepository;
    }

    @Override
    public void run(ApplicationArguments args) throws Exception {
        if (planRepository.count() == 0) {
            Plan free = new Plan();
            free.setName("Free");
            free.setDescription("Perfect for small teams getting started");
            free.setMonthlyPrice(0);
            free.setYearlyPrice(0);
            free.setFeatured(false);
            planRepository.save(free);

            Plan pro = new Plan();
            pro.setName("Professional");
            pro.setDescription("For growing teams that need more power");
            pro.setMonthlyPrice(12);
            pro.setYearlyPrice(120);
            pro.setFeatured(true);
            planRepository.save(pro);

            Plan business = new Plan();
            business.setName("Business");
            business.setDescription("Advanced features for large teams");
            business.setMonthlyPrice(25);
            business.setYearlyPrice(250);
            business.setFeatured(false);
            planRepository.save(business);

            Plan enterprise = new Plan();
            enterprise.setName("Enterprise");
            enterprise.setDescription("Custom solutions for enterprises");
            enterprise.setMonthlyPrice(0);
            enterprise.setYearlyPrice(0);
            enterprise.setFeatured(false);
            planRepository.save(enterprise);
        }

        if (invoiceRepository.count() == 0) {
            Invoice i1 = new Invoice();
            i1.setInvoiceNumber("INV-2024-002");
            i1.setDate(LocalDate.of(2024,2,1));
            i1.setAmount(600);
            i1.setStatus("Paid");
            invoiceRepository.save(i1);

            Invoice i2 = new Invoice();
            i2.setInvoiceNumber("INV-2024-001");
            i2.setDate(LocalDate.of(2024,1,1));
            i2.setAmount(600);
            i2.setStatus("Paid");
            invoiceRepository.save(i2);

            Invoice i3 = new Invoice();
            i3.setInvoiceNumber("INV-2023-012");
            i3.setDate(LocalDate.of(2023,12,1));
            i3.setAmount(600);
            i3.setStatus("Paid");
            invoiceRepository.save(i3);
        }

        if (subscriptionRepository.count() == 0) {
            Subscription s = new Subscription();
            s.setOrganizationName("Kavya Technologies");
            s.setPlanName("Professional");
            s.setBillingCycle("monthly");
            subscriptionRepository.save(s);
        }
    }
}
